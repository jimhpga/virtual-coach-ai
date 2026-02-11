import argparse, json, os, sys
import cv2

def die(msg):
    raise SystemExit(msg)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_video", required=True)
    ap.add_argument("--out", dest="out_json", required=True)
    ap.add_argument("--model", dest="model_task", required=True)
    ap.add_argument("--sample", dest="sample", type=int, default=900)
    args = ap.parse_args()

    in_video = args.in_video
    out_json = args.out_json
    model_task = args.model_task
    sample = max(1, int(args.sample))

    if not os.path.exists(in_video):
        die(f"Missing input video: {in_video}")
    if not os.path.exists(model_task):
        die(f"Missing model task: {model_task}")

    # Import MediaPipe Tasks (Pose Landmarker)
    try:
        import mediapipe as mp
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision
    except Exception as e:
        die("MediaPipe Tasks not available. Install requirements: pip install -r tools/pose/requirements.txt\n" + str(e))

    BaseOptions = mp.tasks.BaseOptions
    PoseLandmarker = vision.PoseLandmarker
    PoseLandmarkerOptions = vision.PoseLandmarkerOptions
    RunningMode = vision.RunningMode

    cap = cv2.VideoCapture(in_video)
    if not cap.isOpened():
        die("Could not open video (cv2.VideoCapture failed). Try remux/re-encode to H.264 MP4.")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if frame_count <= 0:
        # Some codecs don't report count; we can still stream through.
        frame_count = None

    # Build indices to process
    if frame_count is not None and frame_count > 0:
        n = min(frame_count, sample)
        # Evenly spaced indices [0..frame_count-1]
        idxs = [int(round(i*(frame_count-1)/(n-1))) if n > 1 else 0 for i in range(n)]
        # De-dup if rounding collides
        idxs = sorted(set(idxs))
    else:
        # Unknown count: just process first `sample` frames sequentially
        idxs = None

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_task),
        running_mode=RunningMode.VIDEO,
        num_poses=1
    )

    frames_out = []

    with PoseLandmarker.create_from_options(options) as landmarker:
        if idxs is not None:
            for j, fi in enumerate(idxs):
                cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
                ok, frame_bgr = cap.read()
                if not ok:
                    continue
                ts_ms = int(round((fi / fps) * 1000.0))
                frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
                res = landmarker.detect_for_video(mp_image, ts_ms)

                lm = []
                if res.pose_landmarks and len(res.pose_landmarks) > 0:
                    for p in res.pose_landmarks[0]:
                        lm.append({
                            "x": float(p.x), "y": float(p.y), "z": float(getattr(p, "z", 0.0)),
                            "visibility": float(getattr(p, "visibility", 1.0))
                        })

                t_norm = (fi / (frame_count-1)) if (frame_count and frame_count > 1) else 0.0
                frames_out.append({"i": int(fi), "t": float(t_norm), "landmarks": lm})
        else:
            fi = 0
            while fi < sample:
                ok, frame_bgr = cap.read()
                if not ok:
                    break
                ts_ms = int(round((fi / fps) * 1000.0))
                frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
                res = landmarker.detect_for_video(mp_image, ts_ms)

                lm = []
                if res.pose_landmarks and len(res.pose_landmarks) > 0:
                    for p in res.pose_landmarks[0]:
                        lm.append({
                            "x": float(p.x), "y": float(p.y), "z": float(getattr(p, "z", 0.0)),
                            "visibility": float(getattr(p, "visibility", 1.0))
                        })

                frames_out.append({"i": int(fi), "t": float(fi / max(1, sample-1)), "landmarks": lm})
                fi += 1

    cap.release()

    os.makedirs(os.path.dirname(out_json), exist_ok=True)
    payload = {
        "frames": frames_out,
        "meta": {
            "fps": float(fps),
            "frame_count": int(frame_count) if frame_count is not None else None,
            "sample": int(sample),
            "model": os.path.basename(model_task)
        }
    }
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)

    print(f"OK wrote: {out_json} frames={len(frames_out)}")

if __name__ == "__main__":
    main()
