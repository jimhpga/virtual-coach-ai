import json, math, argparse, os
from typing import Dict, Any, List, Tuple, Optional

try:
    import cv2
except Exception:
    cv2 = None

import numpy as np

# ---- Helpers ----
def clamp01(x: float) -> float:
    return float(max(0.0, min(1.0, x)))

def norm2(v: np.ndarray) -> float:
    return float(np.linalg.norm(v) + 1e-12)

def unit(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v) + 1e-12
    return v / n

def angle_deg(v: np.ndarray) -> float:
    # image plane angle: atan2(y, x) in degrees
    return float(math.degrees(math.atan2(float(v[1]), float(v[0]))))

def wrap_deg(d: float) -> float:
    # wrap to [-180, 180]
    while d > 180: d -= 360
    while d < -180: d += 360
    return float(d)

def get_landmark(frame: Dict[str, Any], idx: int) -> Tuple[float,float,float,float]:
    lm = frame["landmarks"][idx]
    return float(lm["x"]), float(lm["y"]), float(lm.get("z",0.0)), float(lm.get("v",0.0))

def vis_avg(frame: Dict[str, Any], ids: List[int]) -> float:
    vs = []
    for i in ids:
        vs.append(get_landmark(frame, i)[3])
    return float(np.mean(vs)) if vs else 0.0

def smooth_vec(frames_xy: List[np.ndarray], i: int, w: int=2) -> np.ndarray:
    # simple centered smoothing for derivative stability
    a = max(0, i-w)
    b = min(len(frames_xy)-1, i+w)
    seg = frames_xy[a:b+1]
    return np.mean(seg, axis=0)

# ---- Optional shaft detection (simple ROI Hough) ----
def detect_shaft_vector(video_path: str, frame_index: int,
                        wristL_xy: np.ndarray, wristR_xy: np.ndarray,
                        roi_pad: int=140) -> Tuple[Optional[np.ndarray], float]:
    """
    Returns (unit_shaft_vec, quality) in image pixel coords.
    quality ~ [0..1]
    """
    if cv2 is None:
        return None, 0.0
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None, 0.0
    cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, frame_index))
    ok, frame = cap.read()
    cap.release()
    if not ok or frame is None:
        return None, 0.0

    h, w = frame.shape[:2]

    # wrists are normalized; convert to pixels
    p1 = (int(wristL_xy[0] * w), int(wristL_xy[1] * h))
    p2 = (int(wristR_xy[0] * w), int(wristR_xy[1] * h))
    cx = int((p1[0] + p2[0]) / 2)
    cy = int((p1[1] + p2[1]) / 2)

    x0 = max(0, cx - roi_pad); x1 = min(w-1, cx + roi_pad)
    y0 = max(0, cy - roi_pad); y1 = min(h-1, cy + roi_pad)
    roi = frame[y0:y1, x0:x1].copy()
    if roi.size == 0:
        return None, 0.0

    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5,5), 0)
    edges = cv2.Canny(gray, 50, 150)

    lines = cv2.HoughLinesP(edges, 1, np.pi/180.0, threshold=50,
                            minLineLength=int(roi_pad*0.6), maxLineGap=10)
    if lines is None:
        return None, 0.0

    # Score lines by length + proximity to center
    best = None
    best_score = -1.0
    for l in lines[:,0,:]:
        xA,yA,xB,yB = map(int, l)
        dx = xB-xA; dy = yB-yA
        length = math.hypot(dx, dy)
        mx = (xA+xB)/2; my=(yA+yB)/2
        dist = math.hypot(mx - roi.shape[1]/2, my - roi.shape[0]/2)
        score = length - 0.75*dist
        if score > best_score:
            best_score = score
            best = (xA,yA,xB,yB,length,dist)

    if best is None:
        return None, 0.0

    xA,yA,xB,yB,length,dist = best
    v = np.array([xB-xA, yB-yA], dtype=np.float32)
    if norm2(v) < 1e-6:
        return None, 0.0

    # quality: longer is better, closer is better
    q_len = min(1.0, length / (roi_pad*2))
    q_dist = 1.0 - min(1.0, dist / (roi_pad*1.1))
    q = clamp01(0.7*q_len + 0.3*q_dist)

    return unit(v), q

# ---- Main ----
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pose", required=True, help="pose JSON file")
    ap.add_argument("--video", default="", help="optional video for shaft detection")
    ap.add_argument("--impact", type=int, default=-1, help="impact frame index (optional)")
    ap.add_argument("--out", required=True, help="output json")
    args = ap.parse_args()

    with open(args.pose, "r", encoding="utf-8") as f:
        data = json.load(f)

    frames = data.get("frames") or data.get("results") or data.get("pose") or None
    # Our generator writes: {"ok":true,"frames":[{"t":...,"landmarks":[...]}...]}
    if isinstance(data, dict) and "frames" in data and isinstance(data["frames"], list):
        frames = data["frames"]
    if frames is None:
        raise SystemExit("Could not find frames array in pose json")

    n = len(frames)
    if n < 5:
        raise SystemExit(f"Not enough frames: {n}")

    # Mediapipe Pose landmark indices
    L_SHO, R_SHO = 11, 12
    L_ELB, R_ELB = 13, 14
    L_WRI, R_WRI = 15, 16
    L_HIP, R_HIP = 23, 24
    L_KNE, R_KNE = 25, 26
    L_ANK, R_ANK = 27, 28
    NOSE = 0

    # Collect normalized XY over time
    lw = [np.array(get_landmark(fr, L_WRI)[0:2], dtype=np.float32) for fr in frames]
    rw = [np.array(get_landmark(fr, R_WRI)[0:2], dtype=np.float32) for fr in frames]
    le = [np.array(get_landmark(fr, L_ELB)[0:2], dtype=np.float32) for fr in frames]
    re = [np.array(get_landmark(fr, R_ELB)[0:2], dtype=np.float32) for fr in frames]
    ls = [np.array(get_landmark(fr, L_SHO)[0:2], dtype=np.float32) for fr in frames]
    rs = [np.array(get_landmark(fr, R_SHO)[0:2], dtype=np.float32) for fr in frames]
    lh = [np.array(get_landmark(fr, L_HIP)[0:2], dtype=np.float32) for fr in frames]
    rh = [np.array(get_landmark(fr, R_HIP)[0:2], dtype=np.float32) for fr in frames]
    lk = [np.array(get_landmark(fr, L_KNE)[0:2], dtype=np.float32) for fr in frames]
    rk = [np.array(get_landmark(fr, R_KNE)[0:2], dtype=np.float32) for fr in frames]
    la = [np.array(get_landmark(fr, L_ANK)[0:2], dtype=np.float32) for fr in frames]
    ra = [np.array(get_landmark(fr, R_ANK)[0:2], dtype=np.float32) for fr in frames]
    nose = [np.array(get_landmark(fr, NOSE)[0:2], dtype=np.float32) for fr in frames]

    # Pick impact frame
    if 0 <= args.impact < n:
        impact = args.impact
        impact_method = "manual"
    else:
        # fallback guess: min avg wrist Y in the second half
        start = int(n*0.45)
        yvals = [float((lw[i][1] + rw[i][1]) * 0.5) for i in range(start, n)]
        impact = start + int(np.argmin(yvals))
        impact_method = "auto_min_wrist_y"

    i = int(np.clip(impact, 2, n-3))

    # Path proxy: wrist velocity (smoothed)
    lw_s = [smooth_vec(lw, k, 2) for k in range(n)]
    rw_s = [smooth_vec(rw, k, 2) for k in range(n)]

    v_lw = lw_s[i+1] - lw_s[i-1]
    v_rw = rw_s[i+1] - rw_s[i-1]
    v_path = unit(0.65*v_lw + 0.35*v_rw)
    path_deg = angle_deg(v_path)

    # Forearm proxy (lead = left arm assumption; we’ll still report both)
    u_fore_L = unit(lw_s[i] - smooth_vec(le, i, 2))
    u_fore_R = unit(rw_s[i] - smooth_vec(re, i, 2))

    # Optional shaft detection
    u_shaft = None
    shaft_q = 0.0
    if args.video and os.path.exists(args.video):
        u_shaft, shaft_q = detect_shaft_vector(args.video, i, lw_s[i], rw_s[i])

    # Face proxy
    if u_shaft is not None:
        # perpendicular in image plane
        u_perp = unit(np.array([-u_shaft[1], u_shaft[0]], dtype=np.float32))
        # blend with lead forearm (left) for stability
        u_face = unit(0.6*u_perp + 0.4*u_fore_L)
        face_method = "shaft_perp_blend_forearm"
    else:
        # pure forearm proxy (weaker, but still useful)
        u_face = u_fore_L
        face_method = "forearm_only"

    face_deg = angle_deg(u_face)
    f2p = wrap_deg(face_deg - path_deg)

    # Classification thresholds (tune later)
    TH = 6.0
    if f2p > TH:
        cls = "likely_open"
    elif f2p < -TH:
        cls = "likely_closed"
    else:
        cls = "likely_square"

    # Delivery package proxies
    shoulders = smooth_vec(rs, i, 2) - smooth_vec(ls, i, 2)
    hips      = smooth_vec(rh, i, 2) - smooth_vec(lh, i, 2)
    sh_deg = angle_deg(shoulders)
    hip_deg = angle_deg(hips)
    sep_deg = wrap_deg(sh_deg - hip_deg)

    # Handle forward proxy: wrist center vs hip center (x)
    wristC = 0.5*(lw_s[i] + rw_s[i])
    hipC   = 0.5*(smooth_vec(lh, i, 2) + smooth_vec(rh, i, 2))
    handle_dx = float(wristC[0] - hipC[0])  # sign depends on camera orientation; still useful as relative metric

    # Knee "bend" proxy via hip-knee-ank angle for left/right
    def joint_angle(a,b,c) -> float:
        ba = a - b; bc = c - b
        ba = ba / (np.linalg.norm(ba) + 1e-12)
        bc = bc / (np.linalg.norm(bc) + 1e-12)
        dot = float(np.clip(np.dot(ba, bc), -1.0, 1.0))
        return float(math.degrees(math.acos(dot)))

    L_knee = joint_angle(smooth_vec(lh,i,2), smooth_vec(lk,i,2), smooth_vec(la,i,2))
    R_knee = joint_angle(smooth_vec(rh,i,2), smooth_vec(rk,i,2), smooth_vec(ra,i,2))

    # Head motion proxy: nose delta from first frame
    head_dx = float(nose[i][0] - nose[0][0])
    head_dy = float(nose[i][1] - nose[0][1])

    # Confidence
    v_base = vis_avg(frames[i], [L_WRI,R_WRI,L_ELB,R_ELB,L_SHO,R_SHO,L_HIP,R_HIP])
    # stability = how consistent wrist velocity direction is in last few frames
    def dir_std(lw_s, rw_s, i, k=4):
        angs=[]
        for j in range(max(2,i-k), min(n-2,i+k)+1):
            v = unit(0.65*(lw_s[j+1]-lw_s[j-1]) + 0.35*(rw_s[j+1]-rw_s[j-1]))
            angs.append(math.atan2(float(v[1]), float(v[0])))
        angs=np.unwrap(np.array(angs))
        return float(np.std(angs))
    st = dir_std(lw_s, rw_s, i, 4)
    stability = clamp01(1.0 - (st / 0.6))  # tune
    conf = clamp01(0.45*v_base + 0.35*stability + 0.20*shaft_q)

    out = {
        "ok": True,
        "impact": {
            "frameIndex": i,
            "method": impact_method,
            "path": {
                "deg": path_deg,
                "method": "wrist_velocity_blend",
            },
            "face": {
                "degProxy": face_deg,
                "method": face_method,
                "shaftDetected": bool(u_shaft is not None),
                "shaftQuality": shaft_q,
            },
            "faceToPath": {
                "degProxy": f2p,
                "classification": cls,
                "thresholdDeg": TH,
            },
            "deliveryPackage": {
                "shoulderLineDeg": sh_deg,
                "hipLineDeg": hip_deg,
                "sepDegProxy": sep_deg,
                "handleDxProxy": handle_dx,
                "kneeAngleDeg": { "left": L_knee, "right": R_knee },
                "headDelta": { "dx": head_dx, "dy": head_dy },
            },
            "confidence": conf,
            "confidenceInputs": {
                "visAvg": v_base,
                "stability": stability,
                "shaftQuality": shaft_q
            }
        }
    }

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)

    print("OK wrote:", args.out)
    print("impact frame:", i, "class:", cls, "f2p:", f2p, "conf:", conf)

if __name__ == "__main__":
    main()
