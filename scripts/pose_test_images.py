import sys, json
from pathlib import Path
import cv2

try:
  from mediapipe.tasks import python
  from mediapipe.tasks.python import vision
  import mediapipe as mp
except Exception as e:
  print("ERROR: mediapipe tasks import failed:", e, file=sys.stderr)
  sys.exit(2)

def main():
  if len(sys.argv) < 4:
    print("usage: pose_test_images.py <model.task> <img_folder> <out.json>", file=sys.stderr)
    sys.exit(1)

  model = sys.argv[1]
  img_folder = Path(sys.argv[2])
  out_json = Path(sys.argv[3])

  base = python.BaseOptions(model_asset_path=model)
  opts = vision.PoseLandmarkerOptions(
    base_options=base,
    running_mode=vision.RunningMode.IMAGE,
    min_pose_detection_confidence=0.3,
    min_pose_presence_confidence=0.3,
    min_tracking_confidence=0.3,
    output_segmentation_masks=False
  )

  imgs = sorted([p for p in img_folder.glob("*.jpg")])[:20]
  out = {"images": [], "meta": {"model": Path(model).name, "count": len(imgs)}}

  with vision.PoseLandmarker.create_from_options(opts) as landmarker:
    for p in imgs:
      bgr = cv2.imread(str(p))
      if bgr is None:
        out["images"].append({"file": p.name, "ok": False, "err": "imread failed"})
        continue

      # IMPORTANT: OpenCV BGR -> RGB for MediaPipe sRGB
      rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
      mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

      res = landmarker.detect(mp_img)
      lms = []
      if res and res.pose_landmarks and len(res.pose_landmarks) > 0:
        lms0 = res.pose_landmarks[0]
        lms = [{"x":lm.x,"y":lm.y,"z":lm.z,"visibility":getattr(lm,"visibility",None),"presence":getattr(lm,"presence",None)} for lm in lms0]

      out["images"].append({"file": p.name, "landmarksCount": len(lms)})

  out_json.write_text(json.dumps(out), encoding="utf-8")
  print("OK wrote", out_json)

if __name__ == "__main__":
  main()