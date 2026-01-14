import sys
import json
import os
from pathlib import Path

import cv2


def die(msg: str, code: int = 1):
    print(msg, file=sys.stderr)
    sys.exit(code)


def safe_int(x, default=0):
    try:
        return int(x)
    except Exception:
        return default


def ensure_dir(p: str):
    Path(p).mkdir(parents=True, exist_ok=True)


def write_thumb(img_bgr, out_path: str, target_w: int = 320):
    h, w = img_bgr.shape[:2]
    if w <= 0 or h <= 0:
        return
    scale = target_w / float(w)
    nh = max(1, int(h * scale))
    thumb = cv2.resize(img_bgr, (target_w, nh), interpolation=cv2.INTER_AREA)
    cv2.imwrite(out_path, thumb, [int(cv2.IMWRITE_JPEG_QUALITY), 85])


def grab_frame(cap, frame_idx: int):
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    ok, img = cap.read()
    if not ok or img is None:
        return None
    return img


def main():
    raw = sys.stdin.read()
    if not raw.strip():
        die("pose_engine.py: expected JSON on stdin")

    try:
        req = json.loads(raw)
    except Exception as e:
        die(f"pose_engine.py: invalid JSON: {e}")

    video_path = (req.get("videoPath") or req.get("video_path") or req.get("path") or "").strip()
    out_dir = (req.get("outDir") or req.get("out_dir") or "").strip()
    impact_frame = safe_int(req.get("impactFrame") or req.get("impact_frame") or 0, 0)

    if not video_path:
        die("pose_engine.py: missing videoPath")
    if not out_dir:
        die("pose_engine.py: missing outDir")

    vp = Path(video_path)
    if not vp.exists():
        die(f"pose_engine.py: video not found: {video_path}")

    ensure_dir(out_dir)

    cap = cv2.VideoCapture(str(vp))
    if not cap.isOpened():
        die(f"pose_engine.py: failed to open video: {video_path}")

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
    if total <= 0:
        die("pose_engine.py: could not read frame count")

    impact = max(0, min(total - 1, impact_frame))

    # P1–P9 placeholder spacing around impact (swap later for real phase logic)
    offsets = [-60, -45, -30, -15, 0, 10, 20, 35, 55]

    frames = []
    for i, off in enumerate(offsets, start=1):
        idx = max(0, min(total - 1, impact + off))
        img = grab_frame(cap, idx)
        if img is None:
            continue

        label = f"P{i}"
        file_name = f"{label}.jpg"
        thumb_name = f"{label}_thumb.jpg"
        out_file = str(Path(out_dir) / file_name)
        out_thumb = str(Path(out_dir) / thumb_name)

        cv2.imwrite(out_file, img, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        write_thumb(img, out_thumb, 320)

        frames.append({
            "p": i,
            "label": label,
            "frame": idx,
            "file": file_name,
            "imageUrl": file_name,
            "thumbUrl": thumb_name
        })

    cap.release()

    if len(frames) < 3:
        die("pose_engine.py: produced too few frames (video too short?)")

    out = {
        "ok": True,
        "fps": fps,
        "totalFrames": total,
        "impactFrame": impact,
        "frames": frames
    }

    print(json.dumps(out))

if __name__ == "__main__":
    main()
