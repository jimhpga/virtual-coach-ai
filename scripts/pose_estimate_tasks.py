import argparse, json, os
import cv2

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True, help="input video file path")
    ap.add_argument("--out", dest="out", required=True, help="output json path")
    ap.add_argument("--model", dest="model", required=True, help="pose landmarker .task model path")
    ap.add_argument("--sample", type=int, default=90, help="max frames to sample")
    args = ap.parse_args()

    inp = args.inp
    outp = args.out
    model_path = args.model

    if not os.path.exists(inp):
        raise SystemExit(f"Input not found: {inp}")
    if not os.path.exists(model_path):
        raise SystemExit(f"Model not found: {model_path}")

    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision

    cap = cv2.VideoCapture(inp)
    if not cap.isOpened():
        raise SystemExit("Could not open video")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    sample = max(1, int(args.sample))
    if frame_count > 0:
        if frame_count <= sample:
            idxs = list(range(frame_count))
        else:
            idxs = [int(round(i*(frame_count-1)/(sample-1))) for i in range(sample)]
            idxs = sorted(list(set(idxs)))
    else:
        idxs = list(range(sample))

    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5
    )
    landmarker = vision.PoseLandmarker.create_from_options(options)

    frames = []
    for fi in idxs:
        cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
        ok, frame = cap.read()
        if not ok:
            break

        h, w = frame.shape[:2]
        # MediaPipe expects RGB
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        result = landmarker.detect(mp_img)

        if not result.pose_landmarks or len(result.pose_landmarks) == 0:
            frames.append({
                "frame": int(fi),
                "t": float(fi / fps),
                "ok": False,
                "w": int(w),
                "h": int(h),
                "landmarks": []
            })
            continue

        # pose_landmarks[0] is list of NormalizedLandmark
        lm = []
        for p in result.pose_landmarks[0]:
            lm.append({
                "x": float(p.x),
                "y": float(p.y),
                "z": float(p.z),
                # Tasks API doesn't always provide visibility; set to 1.0 if missing
                "v": float(getattr(p, "visibility", 1.0))
            })

        frames.append({
            "frame": int(fi),
            "t": float(fi / fps),
            "ok": True,
            "w": int(w),
            "h": int(h),
            "landmarks": lm
        })

    cap.release()

    out = {
        "version": "pose_tasks_v1",
        "input": os.path.basename(inp),
        "fps": float(fps),
        "frameCount": int(frame_count),
        "sampled": len(frames),
        "model": os.path.basename(model_path),
        "frames": frames
    }

    os.makedirs(os.path.dirname(outp), exist_ok=True)
    with open(outp, "w", encoding="utf-8") as f:
        json.dump(out, f)

    print(f"OK wrote: {outp}  frames:{len(frames)}  fps:{fps}")

if __name__ == "__main__":
    main()
