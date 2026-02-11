import argparse, json, os
import cv2
import numpy as np
import mediapipe as mp

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--out", dest="outp", required=True)
    ap.add_argument("--sample", type=int, default=1)
    ap.add_argument("--complexity", type=int, default=2, choices=[0,1,2])
    ap.add_argument("--det", type=float, default=0.1)   # detection confidence
    ap.add_argument("--trk", type=float, default=0.1)   # tracking confidence
    args = ap.parse_args()

    cap = cv2.VideoCapture(args.inp)
    if not cap.isOpened():
        print("ERROR: could not open video:", args.inp)
        raise SystemExit(1)

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    pose = mp.solutions.pose.Pose(
        static_image_mode=False,
        model_complexity=args.complexity,
        enable_segmentation=False,
        min_detection_confidence=float(args.det),
        min_tracking_confidence=float(args.trk),
    )

    frames = []
    non_empty_33 = 0
    detected_frames = 0

    i = 0
    while True:
        ok, bgr = cap.read()
        if not ok:
            break

        if args.sample > 1 and (i % args.sample) != 0:
            i += 1
            continue

        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        rgb = np.ascontiguousarray(rgb, dtype=np.uint8)

        res = pose.process(rgb)

        lms_out = []
        if res and res.pose_landmarks and res.pose_landmarks.landmark:
            lms = res.pose_landmarks.landmark
            if len(lms) == 33:
                detected_frames += 1
                non_empty_33 += 1
                for lm in lms:
                    lms_out.append({
                        "x": float(lm.x),
                        "y": float(lm.y),
                        "z": float(lm.z),
                        "v": float(getattr(lm, "visibility", 0.0))
                    })

        frames.append({"i": int(i), "t": float(i / max(1e-6, fps)), "landmarks": lms_out})

        # light progress signal
        if i in (0,1,2,3,4,50,100,150,200,250):
            print(f"DBG i={i} ok33={1 if len(lms_out)==33 else 0} total33={non_empty_33}")

        i += 1

    cap.release()
    pose.close()

    out = {
        "frames": frames,
        "meta": {
            "fps": float(fps),
            "frame_count": int(frame_count),
            "sample": int(args.sample),
            "engine": "mediapipe.solutions.pose",
            "model_complexity": int(args.complexity),
            "min_detection_confidence": float(args.det),
            "min_tracking_confidence": float(args.trk),
        }
    }

    os.makedirs(os.path.dirname(args.outp), exist_ok=True)
    with open(args.outp, "w", encoding="utf-8") as f:
        json.dump(out, f)

    pct = (100.0 * non_empty_33 / max(1, len(frames)))
    print(f"OK wrote: {args.outp} frames={len(frames)} nonEmpty33={non_empty_33} pct={pct:.1f}%")

    # hard-fail if basically empty
    if non_empty_33 == 0:
        print("ERROR: 0 pose detections across video - failing.")
        raise SystemExit(2)

if __name__ == "__main__":
    main()