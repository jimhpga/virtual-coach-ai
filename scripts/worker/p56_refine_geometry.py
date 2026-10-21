import argparse, json, os, sys
from pathlib import Path
from types import SimpleNamespace

import cv2
import joblib
import mediapipe as mp
import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from p56_features_v1 import (
    FEATURE_SCHEMA,
    TOTAL_FEATURE_COUNT,
    add_temporal_deltas,
    frame_base_features,
)


def load_json(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def decode_ordered(model5, model6, seq, p4, p7):
    if len(seq) < 4:
        return None

    X = np.asarray([z["x"] for z in seq], dtype=float)
    if X.shape[1] != TOTAL_FEATURE_COUNT:
        raise RuntimeError(f"Feature mismatch {X.shape}")

    s5 = np.asarray(model5.predict(X), dtype=float)
    s6 = np.asarray(model6.predict(X), dtype=float)
    frames = np.asarray([z["frame"] for z in seq], dtype=int)

    best = None
    for i, fi in enumerate(frames):
        for j, fj in enumerate(frames):
            if fj <= fi:
                continue
            boundary_penalty = (0.12 if fi <= p4 else 0.0) + (
                0.12 if fj >= p7 else 0.0
            )
            score = float(s5[i] + s6[j] - boundary_penalty)
            if best is None or score > best[0]:
                best = (score, i, j)

    if best is None:
        return None

    joint_score, i5, i6 = best
    p5 = int(frames[i5])
    p6 = int(frames[i6])

    order5 = np.argsort(s5)[::-1]
    order6 = np.argsort(s6)[::-1]
    second5 = float(s5[order5[1]]) if len(order5) > 1 else 0.0
    second6 = float(s6[order6[1]]) if len(order6) > 1 else 0.0

    score5 = float(s5[i5])
    score6 = float(s6[i6])
    margin5 = max(0.0, score5 - second5)
    margin6 = max(0.0, score6 - second6)

    conf5 = float(np.clip(0.35 + 0.50 * score5 + 0.60 * margin5, 0.20, 0.98))
    conf6 = float(np.clip(0.35 + 0.50 * score6 + 0.60 * margin6, 0.20, 0.98))

    return {
        "jointScore": round(float(joint_score), 6),
        "P5": p5,
        "P6": p6,
        "P5EventScore": round(score5, 6),
        "P6EventScore": round(score6, 6),
        "P5Margin": round(margin5, 6),
        "P6Margin": round(margin6, 6),
        "P5Confidence": round(conf5, 3),
        "P6Confidence": round(conf6, 3),
        "featureFrames": len(seq),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--phases", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--pose", default="")
    ap.add_argument("--repo", default="")
    ap.add_argument("--minConfidence", type=float, default=0.60)
    args = ap.parse_args()

    video = os.path.abspath(args.video)
    phases = load_json(args.phases)
    p4 = int(phases["P4"])
    p7 = int(phases["P7"])

    if p7 - p4 < 3:
        raise RuntimeError(f"P4-P7 corridor too short: {p4}->{p7}")

    repo = (
        Path(args.repo).resolve()
        if args.repo
        else HERE.parent.parent
    )
    model_dir = repo / "models" / "p56_corridor_v1"
    metadata = load_json(model_dir / "metadata.json")
    if metadata.get("feature_schema") != FEATURE_SCHEMA:
        raise RuntimeError(
            f"Feature schema mismatch: {metadata.get('feature_schema')} != {FEATURE_SCHEMA}"
        )

    model5 = joblib.load(model_dir / "p5_model.joblib")
    model6 = joblib.load(model_dir / "p6_model.joblib")

    cap = cv2.VideoCapture(video)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video}")

    fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
    LM = mp.solutions.pose.PoseLandmark

    cached_pose = {}
    if args.pose and os.path.isfile(args.pose):
        pose_json = load_json(args.pose)
        for idx, fr in enumerate(pose_json.get("frames") or []):
            landmarks = fr.get("landmarks") or []
            if len(landmarks) < 33:
                continue
            fi = int(fr.get("i", fr.get("frame", idx)))
            cached_pose[fi] = landmarks

    def cached_result(fi):
        landmarks = cached_pose.get(fi)
        if not landmarks:
            return None
        objs = [
            SimpleNamespace(
                x=float(lm.get("x", 0.0)),
                y=float(lm.get("y", 0.0)),
                z=float(lm.get("z", 0.0)),
                visibility=float(lm.get("v", lm.get("visibility", 1.0))),
            )
            for lm in landmarks
        ]
        return SimpleNamespace(
            pose_landmarks=SimpleNamespace(landmark=objs)
        )

    pose_engine = None
    if not cached_pose:
        pose_engine = mp.solutions.pose.Pose(
            static_image_mode=True,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.25,
        )

    by_view = {"face_on": [], "dtl": []}
    decoded = 0
    pose_reused = 0
    span = max(1, p7 - p4)

    try:
        cap.set(cv2.CAP_PROP_POS_FRAMES, p4)
        for fi in range(p4, p7 + 1):
            ok, image = cap.read()
            if not ok:
                continue

            result = cached_result(fi)
            if result is not None:
                pose_reused += 1
            elif pose_engine is not None:
                result = pose_engine.process(
                    cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                )
            else:
                result = None

            decoded += 1
            for view in ("face_on", "dtl"):
                x = frame_base_features(
                    image,
                    view,
                    (fi - p4) / span,
                    result,
                    LM,
                )
                if x is not None:
                    by_view[view].append({"frame": fi, "x": x})
    finally:
        if pose_engine is not None:
            pose_engine.close()
        cap.release()

    results = {}
    for view, seq in by_view.items():
        seq = add_temporal_deltas(seq)
        decoded_result = decode_ordered(model5, model6, seq, p4, p7)
        if decoded_result is not None:
            results[view] = decoded_result

    if not results:
        out = {
            "ok": False,
            "status": "insufficient_geometry",
            "schema": "VCA_P56_GEOMETRY_REFINER_V1",
            "featureSchema": FEATURE_SCHEMA,
            "P4": p4,
            "P7": p7,
            "decodedFrames": decoded,
            "poseReusedFrames": pose_reused,
            "poseSource": "cached_dense_pose" if cached_pose else "fresh_mediapipe",
            "minConfidence": args.minConfidence,
            "views": {},
        }
    else:
        chosen_view, chosen = max(
            results.items(), key=lambda kv: kv[1]["jointScore"]
        )
        conf5 = float(chosen["P5Confidence"])
        conf6 = float(chosen["P6Confidence"])
        confidence_ok = (
            conf5 >= args.minConfidence and conf6 >= args.minConfidence
        )

        view_scores = {
            view: round(float(result["jointScore"]), 6)
            for view, result in results.items()
        }
        sorted_scores = sorted(view_scores.values(), reverse=True)
        view_margin = (
            sorted_scores[0] - sorted_scores[1]
            if len(sorted_scores) > 1
            else sorted_scores[0]
        )

        geometry_p5 = int(chosen["P5"])
        geometry_p6 = int(chosen["P6"])
        timing_p5 = int(round(p7 - 0.150 * fps))
        timing_p6 = int(round(p7 - 0.070 * fps))

        fused_p5 = geometry_p5
        fused_p6 = geometry_p6
        fusion_p5 = False
        fusion_p6 = False

        # Timing is only a weak adjacent-frame tie-break when the geometry model
        # is marginally confident. It can never move a checkpoint by >1 frame.
        if 0.60 <= conf5 < 0.66 and abs(timing_p5 - geometry_p5) <= 1:
            fused_p5 = timing_p5
            fusion_p5 = fused_p5 != geometry_p5
        if 0.60 <= conf6 < 0.66 and abs(timing_p6 - geometry_p6) <= 1:
            fused_p6 = timing_p6
            fusion_p6 = fused_p6 != geometry_p6

        out = {
            "ok": bool(confidence_ok),
            "status": "refined" if confidence_ok else "low_confidence",
            "schema": "VCA_P56_GEOMETRY_REFINER_V1",
            "featureSchema": FEATURE_SCHEMA,
            "modelSchema": metadata.get("schema"),
            "P4": p4,
            "P5": int(fused_p5),
            "P6": int(fused_p6),
            "P7": p7,
            "geometryP5": geometry_p5,
            "geometryP6": geometry_p6,
            "timingPriorP5": timing_p5,
            "timingPriorP6": timing_p6,
            "fusionAppliedP5": fusion_p5,
            "fusionAppliedP6": fusion_p6,
            "P5Confidence": conf5,
            "P6Confidence": conf6,
            "minConfidence": args.minConfidence,
            "autoView": chosen_view,
            "autoViewMargin": round(float(view_margin), 6),
            "viewScores": view_scores,
            "selected": chosen,
            "views": results,
            "fps": fps,
            "decodedFrames": decoded,
            "poseReusedFrames": pose_reused,
            "poseSource": "cached_dense_pose" if cached_pose else "fresh_mediapipe",
            "modelValidation": {
                "obsLeaveOneSwingOut": metadata.get("held_out_validation"),
                "miniGoldHoldout": metadata.get("independent_holdout"),
            },
        }

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)

    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
