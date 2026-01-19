import argparse, json, os, sys
from typing import Dict, Any, List
import cv2
from tqdm import tqdm
import mediapipe as mp

MP_POSE = mp.solutions.pose

LANDMARK_NAMES = [
  "nose","left_eye_inner","left_eye","left_eye_outer","right_eye_inner","right_eye","right_eye_outer",
  "left_ear","right_ear","mouth_left","mouth_right",
  "left_shoulder","right_shoulder","left_elbow","right_elbow","left_wrist","right_wrist",
  "left_pinky","right_pinky","left_index","right_index","left_thumb","right_thumb",
  "left_hip","right_hip","left_knee","right_knee","left_ankle","right_ankle",
  "left_heel","right_heel","left_foot_index","right_foot_index"
]

def main():
  ap = argparse.ArgumentParser()
  ap.add_argument("--video", required=True)
  ap.add_argument("--out", required=True)
  ap.add_argument("--every", type=int, default=1)
  ap.add_argument("--min_conf", type=float, default=0.3)
  ap.add_argument("--model_complexity", type=int, default=1, choices=[0,1,2])
  args = ap.parse_args()

  if not os.path.exists(args.video):
    print(f"ERROR: video not found: {args.video}", file=sys.stderr)
    sys.exit(1)

  cap = cv2.VideoCapture(args.video)
  if not cap.isOpened():
    print("ERROR: could not open video", file=sys.stderr)
    sys.exit(1)

  fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
  total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
  w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
  h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

  pose = MP_POSE.Pose(
    static_image_mode=False,
    model_complexity=args.model_complexity,
    enable_segmentation=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
  )

  frames_out: List[Dict[str, Any]] = []
  every = max(1, int(args.every))
  min_conf = float(args.min_conf)

  pbar = tqdm(total=total, desc="Pose", unit="f")
  idx = 0
  kept = 0

  while True:
    ok, frame = cap.read()
    if not ok:
      break

    if (idx % every) != 0:
      idx += 1
      pbar.update(1)
      continue

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    res = pose.process(rgb)

    joints: Dict[str, Any] = {}
    if res.pose_landmarks and res.pose_landmarks.landmark:
      for i, lm in enumerate(res.pose_landmarks.landmark):
        name = LANDMARK_NAMES[i] if i < len(LANDMARK_NAMES) else f"lm_{i}"
        c = float(getattr(lm, "visibility", 0.0) or 0.0)
        joints[name] = {"x": float(lm.x), "y": float(lm.y), "c": c}

    t_ms = (idx / fps * 1000.0) if fps and fps > 0 else None
    frames_out.append({"frame": idx, "t_ms": t_ms, "joints": joints})
    kept += 1
    idx += 1
    pbar.update(1)

  pbar.close()
  cap.release()
  pose.close()

  os.makedirs(os.path.dirname(args.out), exist_ok=True)
  out_obj = {
    "version": 1,
    "video_path": os.path.abspath(args.video),
    "fps": fps,
    "width": w,
    "height": h,
    "every": every,
    "min_conf": min_conf,
    "frames": frames_out
  }

  with open(args.out, "w", encoding="utf-8") as f:
    json.dump(out_obj, f, ensure_ascii=False)

  print(f"OK: wrote pose json: {args.out}")
  print(f"Frames total: {total} | processed: {kept} | fps: {fps} | size: {w}x{h}")

if __name__ == "__main__":
  main()
