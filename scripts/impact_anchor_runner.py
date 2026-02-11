import os, json, argparse, subprocess
import cv2
import numpy as np

def clamp(x,a,b): return max(a, min(b, x))

def get_fps_and_count(inp, fps_hint=25.0):
    cap = cv2.VideoCapture(inp)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {inp}")

    try:
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    except Exception:
        fps = 0.0
    if fps <= 0:
        fps = float(fps_hint) if fps_hint else 25.0

    try:
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    except Exception:
        frame_count = 0

    # ffprobe fallback
    if frame_count <= 0:
        try:
            cmd = [
                "ffprobe","-v","error",
                "-select_streams","v:0",
                "-count_frames",
                "-show_entries","stream=nb_read_frames,nb_frames,duration",
                "-of","json",
                inp
            ]
            j = json.loads(subprocess.check_output(cmd, text=True, stderr=subprocess.STDOUT))
            st = (j.get("streams") or [{}])[0]
            nf = st.get("nb_read_frames") or st.get("nb_frames")
            if nf is not None:
                frame_count = int(float(nf))
            else:
                dur = float(st.get("duration") or 0.0)
                if dur > 0 and fps > 0:
                    frame_count = int(round(dur * fps))
        except Exception:
            pass

    if frame_count <= 0:
        raise RuntimeError("Could not determine frame_count (opencv+ffprobe failed)")

    return cap, fps, frame_count

def read_frame(cap, idx):
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
    ok, bgr = cap.read()
    return ok, bgr

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--outdir", required=True)
    ap.add_argument("--fps_hint", type=float, default=25.0)
    ap.add_argument("--early_frames", type=int, default=35)
    ap.add_argument("--debug_every", type=int, default=25)
    args = ap.parse_args()

    os.makedirs(args.outdir, exist_ok=True)

    cap, fps, frame_count = get_fps_and_count(args.inp, args.fps_hint)

    # Minimal "safe" anchor for tonight:
    # Use best-available rule:
    # - If we can detect any motion peak in center area, use that as club peak.
    # - Ball event is left null (we'll wire real ball detector tomorrow).
    # This produces a stable impact_anchor.json so the rest of your pipeline can run.

    # Scan grayscale motion in a central ROI as club proxy
    roi = (0.25, 0.20, 0.75, 0.85)  # x1,y1,x2,y2 as fractions
    peak_idx = 0
    peak_val = 0.0
    prev = None

    for i in range(0, frame_count):
        ok, bgr = read_frame(cap, i)
        if not ok or bgr is None:
            continue
        h,w = bgr.shape[:2]
        x1 = int(w*roi[0]); y1=int(h*roi[1]); x2=int(w*roi[2]); y2=int(h*roi[3])
        g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)[y1:y2, x1:x2]
        if prev is None:
            prev = g
            continue
        d = cv2.absdiff(g, prev)
        m = float(np.mean(d)) / 255.0
        if m > peak_val:
            peak_val = m
            peak_idx = i
        prev = g
        if args.debug_every and (i % args.debug_every == 0):
            pass

    # Build output
    out = {
        "video": args.inp,
        "meta": {
            "fps": fps,
            "frame_count": frame_count,
            "method": "club_proxy_motion_roi"
        },
        "ball": {
            "event_frame": None,
            "note": "ball detector not wired in this runner yet"
        },
        "club": {
            "peak_frame": int(peak_idx),
            "peak_val": float(peak_val)
        },
        "impact": {
            "P7_frame": int(peak_idx),
            "fuse": "club_preferred"
        }
    }

    p = os.path.join(args.outdir, "impact_anchor.json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    print(f"OK impact_anchor.json P7={out['impact']['P7_frame']} fuse={out['impact']['fuse']} clubPeak={out['club']['peak_frame']}")

if __name__ == "__main__":
    main()