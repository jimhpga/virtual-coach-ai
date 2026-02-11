import sys, json, os
from pathlib import Path

import cv2

def die(msg, code=1):
    print(msg, file=sys.stderr)
    sys.exit(code)

def safe_int(x, default=0):
    try:
        return int(x)
    except Exception:
        return default

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

def crop_frame(bgr, bbox, pad=0.35):
    # bbox: {x1,y1,x2,y2} in pixel coords
    h, w = bgr.shape[:2]
    x1 = int(bbox.get("x1", 0)); y1 = int(bbox.get("y1", 0))
    x2 = int(bbox.get("x2", w)); y2 = int(bbox.get("y2", h))
    x1 = clamp(x1, 0, w-1); x2 = clamp(x2, 1, w)
    y1 = clamp(y1, 0, h-1); y2 = clamp(y2, 1, h)
    bw = max(1, x2 - x1)
    bh = max(1, y2 - y1)

    cx = x1 + bw / 2.0
    cy = y1 + bh / 2.0

    # expand with pad
    ew = bw * (1.0 + pad)
    eh = bh * (1.0 + pad)

    nx1 = int(cx - ew/2.0); ny1 = int(cy - eh/2.0)
    nx2 = int(cx + ew/2.0); ny2 = int(cy + eh/2.0)

    nx1 = clamp(nx1, 0, w-1); nx2 = clamp(nx2, 1, w)
    ny1 = clamp(ny1, 0, h-1); ny2 = clamp(ny2, 1, h)

    if nx2 <= nx1 or ny2 <= ny1:
        return bgr, {"x1":0,"y1":0,"x2":w,"y2":h,"pad":pad}

    return bgr[ny1:ny2, nx1:nx2].copy(), {"x1":nx1,"y1":ny1,"x2":nx2,"y2":ny2,"pad":pad}

def score_landmarks(lms):
    # lms: list of 33 landmarks
    if not lms:
        return 0.0
    # Score by average visibility+presence when available
    vis = 0.0
    pres = 0.0
    n = 0
    for lm in lms:
        n += 1
        v = getattr(lm, "visibility", 0.0) if lm is not None else 0.0
        p = getattr(lm, "presence", 0.0) if lm is not None else 0.0
        vis += float(v)
        pres += float(p)
    if n == 0:
        return 0.0
    return (vis / n) + (pres / n)

def main():
    raw = sys.stdin.read()
    if not raw.strip():
        die("phase_pose_extract.py: expected JSON on stdin")

    try:
        req = json.loads(raw)
    except Exception as e:
        die(f"phase_pose_extract.py: invalid JSON: {e}")

    video = (req.get("video") or req.get("videoPath") or req.get("in") or "").strip()
    model_task = (req.get("model") or req.get("model_task") or "").strip()
    out_json = (req.get("out") or req.get("outJson") or req.get("out_json") or "").strip()

    phases = req.get("phases") or {}
    window = safe_int(req.get("window") or 2, 2)   # ±window frames around each phase
    every_n = safe_int(req.get("everyN") or req.get("sample") or 1, 1)  # step inside window
    bbox = req.get("bbox")  # optional bbox dict {x1,y1,x2,y2}
    pad = float(req.get("pad") or (bbox.get("pad") if isinstance(bbox, dict) and "pad" in bbox else 0.35) or 0.35)

    if not video:
        die("phase_pose_extract.py: missing video")
    if not model_task:
        die("phase_pose_extract.py: missing model (.task)")
    if not out_json:
        die("phase_pose_extract.py: missing out")

    vp = Path(video)
    if not vp.exists():
        die(f"phase_pose_extract.py: video not found: {video}")
    mp = Path(model_task)
    if not mp.exists():
        die(f"phase_pose_extract.py: model not found: {model_task}")

    # Lazy import after validation
    try:
        import mediapipe as mp_pkg
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision
        from mediapipe.framework.formats import landmark_pb2
    except Exception as e:
        die("phase_pose_extract.py: mediapipe tasks not available. " + str(e))

    cap = cv2.VideoCapture(str(vp))
    if not cap.isOpened():
        die(f"phase_pose_extract.py: failed to open video: {video}")

    fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if total <= 0:
        die("phase_pose_extract.py: could not read frame count")

    # Pose landmarker in VIDEO mode (this is the robust one)
    base = mp_python.BaseOptions(model_asset_path=str(mp))
    options = vision.PoseLandmarkerOptions(
        base_options=base,
        running_mode=vision.RunningMode.IMAGE,
        num_poses=1
    )

    def read_frame(idx):
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, bgr = cap.read()
        if not ok or bgr is None:
            return None
        if isinstance(bbox, dict):
            bgr2, used = crop_frame(bgr, bbox, pad=pad)
            return bgr2, used
        return bgr, None

    out = {
        "ok": True,
        "meta": {
            "video": str(vp),
            "fps": fps,
            "frame_count": total,
            "model": os.path.basename(str(mp)),
            "running_mode": "VIDEO",
            "window": window,
            "everyN": every_n,
            "bbox": bbox if isinstance(bbox, dict) else None,
            "pad": pad
        },
        "phases": []
    }

    with vision.PoseLandmarker.create_from_options(options) as landmarker:
        for key in sorted(phases.keys(), key=lambda x: int(x[1:]) if x and x[0].upper()=="P" and x[1:].isdigit() else x):
            base_idx = safe_int(phases.get(key), -1)
            if base_idx < 0:
                out["phases"].append({"phase": key, "base_frame": base_idx, "best": None, "candidates": []})
                continue

            base_idx = clamp(base_idx, 0, total-1)
            candidates = []
            best = None
            best_score = -1e9

            start = clamp(base_idx - window, 0, total-1)
            end   = clamp(base_idx + window, 0, total-1)

            idx = start
            while idx <= end:
                fr = read_frame(idx)
                if fr is None:
                    idx += max(1, every_n)
                    continue
                bgr, used_bbox = fr
                rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

                # timestamp required in ms for VIDEO mode
                ts_ms = int((idx / max(1e-6, fps)) * 1000.0)

                mp_image = mp_pkg.Image(image_format=mp_pkg.ImageFormat.SRGB, data=rgb)
                res = landmarker.detect(mp_image)
                pose_lms = []
                if res and getattr(res, "pose_landmarks", None):
                    if len(res.pose_landmarks) > 0:
                        pose_lms = res.pose_landmarks[0] or []

                lm_count = len(pose_lms) if pose_lms else 0
                sc = score_landmarks(pose_lms) if lm_count else 0.0

                cand = {
                    "frame": idx,
                    "timestamp_ms": ts_ms,
                    "landmarksCount": lm_count,
                    "score": sc,
                    "used_bbox": used_bbox
                }
                candidates.append(cand)

                if lm_count == 33 and sc > best_score:
                    best_score = sc
                    # Serialize landmarks to plain dict list
                    best = {
                        "frame": idx,
                        "timestamp_ms": ts_ms,
                        "score": sc,
                        "landmarks": [
                            {
                                "x": float(lm.x),
                                "y": float(lm.y),
                                "z": float(lm.z),
                                "visibility": float(getattr(lm, "visibility", 0.0)),
                                "presence": float(getattr(lm, "presence", 0.0))
                            } for lm in pose_lms
                        ],
                        "used_bbox": used_bbox
                    }

                idx += max(1, every_n)

            out["phases"].append({
                "phase": key,
                "base_frame": base_idx,
                "best": best,
                "candidates": candidates
            })

    cap.release()

    # basic health: require at least 5 phases with best landmarks
    good = sum(1 for p in out["phases"] if p.get("best") and p["best"].get("landmarks") and len(p["best"]["landmarks"]) == 33)
    out["meta"]["phases_good"] = good
    if good < 5:
        out["ok"] = False
        out["meta"]["warning"] = "Low phase detection coverage. Improve framing/light or provide bbox."

    Path(out_json).parent.mkdir(parents=True, exist_ok=True)
    Path(out_json).write_text(json.dumps(out), encoding="utf-8")

    print(f"OK wrote: {out_json} phases_good={good}/{len(out['phases'])}")

if __name__ == "__main__":
    main()
