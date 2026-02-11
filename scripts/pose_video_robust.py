import numpy as np
import sys, json, os, cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

def die(msg):
    print(msg, file=sys.stderr)
    sys.exit(1)

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="vid", required=True)
    ap.add_argument("--out", dest="out", required=True)
    ap.add_argument("--model", dest="model", required=True)
    ap.add_argument("--sample", dest="sample", type=int, default=1)
    args = ap.parse_args()

    vid = args.vid
    outp = args.out
    model_path = os.path.abspath(args.model)

    if not os.path.exists(vid):
        die(f"❌ Video not found: {vid}")
    if not os.path.exists(model_path):
        die(f"❌ Model not found: {model_path}")

    cap = cv2.VideoCapture(vid)
    if not cap.isOpened():
        die("❌ Could not open video")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    base = mp_python.BaseOptions(model_asset_path=model_path)
    opts = vision.PoseLandmarkerOptions(
        base_options=base,
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1
    )

    frames = []
    non_empty = 0
    i = 0
    detected_frames = 0
    any_det_frames = 0
    max_lms_len = 0
    with vision.PoseLandmarker.create_from_options(opts) as landmarker:
        while True:
            ok, bgr = cap.read()
            if not ok:
                break

            if args.sample > 1 and (i % args.sample) != 0:
                i += 1
                continue
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            rgb = np.ascontiguousarray(rgb, dtype=np.uint8)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            ts_ms = int((i / max(1e-6, fps)) * 1000.0)

            res = landmarker.detect_for_video(mp_image, ts_ms)

            # DBG_ANYDET

            try:

                ppl = len(res.pose_landmarks) if (res and getattr(res, "pose_landmarks", None)) else 0

                l0  = len(res.pose_landmarks[0]) if ppl > 0 else 0

                if ppl > 0:

                    any_det_frames += 1

                    if l0 > max_lms_len: max_lms_len = l0

                if i < 5 or (i % 60 == 0):

                    print(f"DBG i={i} ppl={ppl} l0={l0} any={any_det_frames} max={max_lms_len}")

            except Exception:

                pass
            lms_out = []
            if res and getattr(res, "pose_landmarks", None) and len(res.pose_landmarks) > 0:
                lms = res.pose_landmarks[0] or []
                # DBG_LMSLEN
                if i < 5 or (i % 60 == 0):
                    try:
                        print(f"DBG i={i} lms_len={len(lms)}")
                    except Exception:
                        pass
                if lms and len(lms) >= 33:
                    detected_frames += 1
                    non_empty += 1
                    for lm in lms[:33]:
                        lms_out.append({
                            "x": float(lm.x),
                            "y": float(lm.y),
                            "z": float(lm.z),
                            "v": float(getattr(lm, "visibility", 0.0))
                        })

            frames.append({"i": i, "t": float(i / max(1e-6, fps)), "landmarks": lms_out})
            i += 1

    cap.release()

    out = {
        "frames": frames,
        "meta": {
            "fps": float(fps),
            "frame_count": frame_count,
            "sample": int(args.sample),
            "model": os.path.basename(model_path),
            "non_empty": int(non_empty),
            "total_frames_written": int(len(frames)),
            "running_mode": "VIDEO"
        }
    }
    os.makedirs(os.path.dirname(outp), exist_ok=True)
    with open(outp, "w", encoding="utf-8") as f:
        if detected_frames == 0:
            print("ERROR: 0 pose detections across video. Output would be empty - failing.")
            raise SystemExit(2)
        json.dump(out, f)

    print(f"OK wrote: {outp} frames={len(frames)} nonEmpty={non_empty}")
if __name__ == "__main__":
    main()