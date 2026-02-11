import argparse, json, sys
from pathlib import Path

import cv2

def die(msg, code=1):
    print(msg, file=sys.stderr)
    sys.exit(code)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_video", required=True)
    ap.add_argument("--out", dest="out_json", required=True)
    ap.add_argument("--model", dest="model_task", required=True)
    ap.add_argument("--sample", dest="sample", type=int, default=1)
    args = ap.parse_args()

    in_video = str(args.in_video)
    out_json = str(args.out_json)
    model_task = str(args.model_task)
    every_n = max(1, int(args.sample or 1))

    vp = Path(in_video)
    mp = Path(model_task)
    if not vp.exists():
        die(f"Could not find video: {vp}")
    if not mp.exists():
        die(f"Could not find model: {mp}")

    try:
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision
        import mediapipe as mp
    except Exception as e:
        die("MediaPipe Tasks not available. Install requirements: pip install -r tools/pose/requirements.txt\n" + str(e))

    cap = cv2.VideoCapture(str(vp))
    if not cap.isOpened():
        die("Could not open video")

    fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if frame_count <= 0:
        # fall back: count frames
        tmp = 0
        while True:
            ok, _ = cap.read()
            if not ok: break
            tmp += 1
        cap.release()
        cap = cv2.VideoCapture(str(vp))
        frame_count = tmp

    # VIDEO mode = tracking across frames
    base = mp_python.BaseOptions(model_asset_path=str(mp))
    options = vision.PoseLandmarkerOptions(
        base_options=base,
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.35,
        min_pose_presence_confidence=0.35,
        min_tracking_confidence=0.35,
        output_segmentation_masks=False
    )

    frames_out = []
    non_empty = 0

    with vision.PoseLandmarker.create_from_options(options) as landmarker:
        i = 0
        while True:
            ok, frame_bgr = cap.read()
            if not ok or frame_bgr is None:
                break

            if (i % every_n) != 0:
                i += 1
                continue

            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)

            # timestamp must be increasing in ms
            ts_ms = int(round((i / fps) * 1000.0))
            res = landmarker.detect_for_video(mp_image, ts_ms)

            lms = []
            if res and res.pose_landmarks and len(res.pose_landmarks) > 0:
                # first person only
                for lm in res.pose_landmarks[0]:
                    lms.append({
                        "x": float(lm.x),
                        "y": float(lm.y),
                        "z": float(lm.z),
                        "visibility": float(getattr(lm, "visibility", 0.0))
                    })

            if len(lms) > 0:
                non_empty += 1

            frames_out.append({ "i": i, "t": round(i / fps, 6), "landmarks": lms })
            i += 1

    cap.release()

    meta = {
        "fps": fps,
        "frame_count": frame_count,
        "sample": every_n,
        "model": mp.name,
        "non_empty": non_empty,
        "total_frames_written": len(frames_out),
        "running_mode": "VIDEO",
        "conf": { "det": 0.35, "pres": 0.35, "track": 0.35 }
    }

    Path(out_json).parent.mkdir(parents=True, exist_ok=True)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump({ "frames": frames_out, "meta": meta }, f)

    print(f"OK wrote: {out_json} frames={len(frames_out)} nonEmpty={non_empty}")

if __name__ == "__main__":
    main()