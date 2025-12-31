import argparse, json, os
import numpy as np
import cv2

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True, help="input video file path")
    ap.add_argument("--out", dest="out", required=True, help="output json path")
    ap.add_argument("--sample", type=int, default=90, help="max frames to sample")
    args = ap.parse_args()

    inp = args.inp
    outp = args.out

    if not os.path.exists(inp):
        raise SystemExit(f"Input not found: {inp}")

    import mediapipe as mp
    mp_pose = mp.solutions.pose

    cap = cv2.VideoCapture(inp)
    if not cap.isOpened():
        raise SystemExit("Could not open video")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    # Sample evenly across the clip (MVP: no event detection yet)
    sample = max(1, int(args.sample))
    idxs = []
    if frame_count > 0:
        if frame_count <= sample:
            idxs = list(range(frame_count))
        else:
            idxs = [int(round(i*(frame_count-1)/(sample-1))) for i in range(sample)]
            idxs = sorted(list(set(idxs)))
    else:
        # unknown frame count: just read until sample
        idxs = list(range(sample))

    frames = []
    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        enable_segmentation=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    ) as pose:

        for fi in idxs:
            cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
            ok, frame = cap.read()
            if not ok:
                break

            h, w = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            res = pose.process(rgb)

            if not res.pose_landmarks:
                frames.append({
                    "frame": int(fi),
                    "t": float(fi / fps),
                    "ok": False,
                    "landmarks": []
                })
                continue

            lm = []
            for p in res.pose_landmarks.landmark:
                lm.append({
                    "x": float(p.x), "y": float(p.y), "z": float(p.z),
                    "v": float(p.visibility)
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
        "version": "pose_v1",
        "input": os.path.basename(inp),
        "fps": float(fps),
        "frameCount": int(frame_count),
        "sampled": len(frames),
        "frames": frames
    }

    os.makedirs(os.path.dirname(outp), exist_ok=True)
    with open(outp, "w", encoding="utf-8") as f:
        json.dump(out, f)

    print(f"OK wrote: {outp}  frames:{len(frames)}  fps:{fps}")

if __name__ == "__main__":
    main()
