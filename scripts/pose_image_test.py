import argparse, json
import numpy as np
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--img", required=True)
    ap.add_argument("--model", required=True)
    args = ap.parse_args()

    bgr = cv2.imread(args.img)
    if bgr is None:
        print("ERROR: could not read image:", args.img)
        raise SystemExit(1)

    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    rgb = np.ascontiguousarray(rgb, dtype=np.uint8)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    base = python.BaseOptions(model_asset_path=args.model)
    opts = vision.PoseLandmarkerOptions(
        base_options=base,
        running_mode=vision.RunningMode.IMAGE,
        output_segmentation_masks=False
    )

    with vision.PoseLandmarker.create_from_options(opts) as landmarker:
        res = landmarker.detect(mp_image)

    ppl = len(res.pose_landmarks) if (res and getattr(res, "pose_landmarks", None)) else 0
    l0  = len(res.pose_landmarks[0]) if ppl > 0 else 0
    print(f"IMAGE_TEST ppl={ppl} l0={l0}")

    if ppl > 0:
        # print first 3 landmarks quick
        for k in range(min(3, l0)):
            lm = res.pose_landmarks[0][k]
            print("lm", k, float(lm.x), float(lm.y), float(lm.z))

if __name__ == "__main__":
    main()