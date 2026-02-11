import sys, json, os
from pathlib import Path
import cv2
import numpy as np

def die(msg, code=1):
    print(msg, file=sys.stderr)
    sys.exit(code)

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

def main():
    if len(sys.argv) < 4:
        die("usage: crop_person_hog.py <video> <out_dir> <sample_n> [pad=0.35]")

    vid = sys.argv[1]
    out_dir = Path(sys.argv[2])
    sample_n = int(sys.argv[3])
    pad = float(sys.argv[4]) if len(sys.argv) >= 5 else 0.35

    if not Path(vid).exists():
        die(f"video not found: {vid}")
    out_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(vid)
    if not cap.isOpened():
        die("failed to open video")

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if total <= 0:
        die("bad frame count")

    # HOG person detector (built-in)
    hog = cv2.HOGDescriptor()
    hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

    # sample a set of frames across the video
    idxs = list(range(0, total, max(1, sample_n)))
    idxs = idxs[:min(len(idxs), 30)]  # cap samples (speed)

    boxes = []
    w0 = h0 = None

    for fi in idxs:
        cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
        ok, frame = cap.read()
        if not ok or frame is None:
            continue
        h, w = frame.shape[:2]
        h0, w0 = h, w

        # Resize down for detection speed if huge
        scale = 1.0
        if w > 1280:
            scale = 1280.0 / w
            frame_small = cv2.resize(frame, (int(w*scale), int(h*scale)))
        else:
            frame_small = frame

        rects, weights = hog.detectMultiScale(frame_small, winStride=(8,8), padding=(16,16), scale=1.05)
        if rects is None or len(rects) == 0:
            continue

        # pick best by weight * area
        best = None
        bestScore = -1
        for (x,y,ww,hh), wt in zip(rects, weights):
            score = float(wt) * (ww*hh)
            if score > bestScore:
                bestScore = score
                best = (x,y,ww,hh)

        if best is None:
            continue

        x,y,ww,hh = best
        # map back up to original coords if scaled
        if scale != 1.0:
            x = int(x/scale); y = int(y/scale); ww = int(ww/scale); hh = int(hh/scale)

        boxes.append((x,y,ww,hh))

    cap.release()

    if not boxes:
        die("no person boxes found. (subject too small / too dark / extreme angle)")

    # robust median bbox
    xs = np.array([b[0] for b in boxes])
    ys = np.array([b[1] for b in boxes])
    ws = np.array([b[2] for b in boxes])
    hs = np.array([b[3] for b in boxes])

    x = int(np.median(xs)); y = int(np.median(ys))
    ww = int(np.median(ws)); hh = int(np.median(hs))

    # add padding
    px = int(ww * pad)
    py = int(hh * pad)

    x1 = clamp(x - px, 0, w0-1)
    y1 = clamp(y - py, 0, h0-1)
    x2 = clamp(x + ww + px, 0, w0-1)
    y2 = clamp(y + hh + py, 0, h0-1)

    meta = {
        "ok": True,
        "samples_used": len(boxes),
        "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "pad": pad}
    }

    # write bbox json
    (out_dir / "crop_meta.json").write_text(json.dumps(meta, indent=2))

    print(json.dumps(meta))

if __name__ == "__main__":
    main()