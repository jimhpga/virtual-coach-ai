import argparse
import glob
import json
import os
import subprocess
import sys
from pathlib import Path


def run(cmd):
    cp = subprocess.run(cmd, capture_output=True, text=True)
    if cp.returncode != 0:
        raise RuntimeError(
            "Command failed:\n"
            + " ".join(str(x) for x in cmd)
            + "\nSTDOUT:\n"
            + cp.stdout
            + "\nSTDERR:\n"
            + cp.stderr
        )
    if cp.stdout.strip():
        print(cp.stdout.strip())
    return cp


def load_json(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def newest(pattern):
    hits = glob.glob(pattern)
    if not hits:
        return None
    return max(hits, key=os.path.getmtime)


def normalize_pose_for_report(pose):
    out = []
    for k, fr in enumerate(pose.get("frames") or []):
        lm = fr.get("landmarks") or []
        if not lm:
            continue
        out.append(
            {
                "frame": int(fr.get("i", fr.get("frame", k))),
                "ok": True,
                "landmarks": [
                    {
                        "x": float(p.get("x", 0.0)),
                        "y": float(p.get("y", 0.0)),
                        "z": float(p.get("z", 0.0)),
                        "v": float(p.get("v", p.get("visibility", 1.0))),
                    }
                    for p in lm
                ],
            }
        )
    return {
        "frames": out,
        "meta": pose.get("meta") or {},
    }


def angle_deg(x1, y1, x2, y2):
    import math
    return math.degrees(math.atan2(y2 - y1, x2 - x1))


def norm180(deg):
    d = float(deg)
    while d <= -180:
        d += 360
    while d > 180:
        d -= 360
    return d


def stack_deg(shaft_deg, arm_deg):
    return abs(norm180(float(shaft_deg) - float(arm_deg)))


def pose_frame_map(pose):
    out = {}
    for k, fr in enumerate(pose.get("frames") or []):
        idx = int(fr.get("i", fr.get("frame", k)))
        out[idx] = fr
    return out


def build_shaft_arm_block(pose, shaft_by):
    fmap = pose_frame_map(pose)

    def phase_block(phase):
        row = shaft_by.get(phase)
        if not row:
            return None

        frame = int(row.get("frame"))
        fr = fmap.get(frame)
        arm = None
        if fr:
            lm = fr.get("landmarks") or []
            if len(lm) >= 16:
                ls = lm[11]
                lw = lm[15]
                arm = angle_deg(
                    float(ls.get("x", 0.0)),
                    float(ls.get("y", 0.0)),
                    float(lw.get("x", 0.0)),
                    float(lw.get("y", 0.0)),
                )

        shaft = row.get("shaft") or {}
        source = str(shaft.get("source") or "")
        conf = int(shaft.get("confidenceRaw") or 0)
        shaft_angle = None
        if source != "unavailable" and conf > 0 and shaft.get("angleDeg") is not None:
            shaft_angle = float(shaft.get("angleDeg"))

        stack = (
            stack_deg(shaft_angle, arm)
            if shaft_angle is not None and arm is not None
            else None
        )

        vision = shaft.get("vision") or {}
        return {
            "phase": phase,
            "frame": frame,
            "armDeg": arm,
            "shaftDeg": shaft_angle,
            "stackDeg": stack,
            "conf": conf,
            "shaftSource": source,
            "shaftLine": vision.get("line") if shaft_angle is not None else None,
            "imageSize": vision.get("imageSize") if shaft_angle is not None else None,
            "why": str(shaft.get("why") or ""),
        }

    p5 = phase_block("P5")
    p6 = phase_block("P6")
    p7 = phase_block("P7")
    phases = [p5, p6, p7]
    confs = [p["conf"] for p in phases if p is not None and isinstance(p.get("conf"), int)]
    confidence_min = min(confs) if confs else None

    all_exist = all(p is not None for p in phases)
    all_arm = all_exist and all(p.get("armDeg") is not None for p in phases)
    all_shaft = all_exist and all(p.get("shaftDeg") is not None for p in phases)
    if all_arm and all_shaft:
        status = "ok" if (confidence_min or 0) >= 25 else "low_confidence"
    else:
        status = "missing"

    release_cliff = (
        float(p6["stackDeg"]) - float(p5["stackDeg"])
        if p5 and p6 and p5.get("stackDeg") is not None and p6.get("stackDeg") is not None
        else None
    )
    finish_drop = (
        float(p7["stackDeg"]) - float(p6["stackDeg"])
        if p6 and p7 and p6.get("stackDeg") is not None and p7.get("stackDeg") is not None
        else None
    )

    return {
        "ok": True,
        "status": status,
        "confidenceMin": confidence_min,
        "meta": {
            "note": "Shaft-vs-left-arm angle (P5/P6/P7). armDeg uses left_shoulder(11)->left_wrist(15).",
            "source": "worker_python_native",
        },
        "P5": p5,
        "P6": p6,
        "P7": p7,
        "metrics": {
            "releaseCliff": release_cliff,
            "finishDrop": finish_drop,
        },
    }


def build_delivery_card(shaft_arm):
    if not shaft_arm:
        return None

    p5 = shaft_arm.get("P5") or {}
    p6 = shaft_arm.get("P6") or {}
    p7 = shaft_arm.get("P7") or {}
    confidence_min = int(shaft_arm.get("confidenceMin") or 0)
    status = str(shaft_arm.get("status") or "missing")

    def metric(key, label, value, unit="deg"):
        return {
            "key": key,
            "label": label,
            "value": float(value) if value is not None else None,
            "unit": unit,
        }

    metrics = [
        metric("shaft_arm_p5", "Shaft-Arm Stack (P5)", p5.get("stackDeg")),
        metric("shaft_arm_p6", "Shaft-Arm Stack (P6)", p6.get("stackDeg")),
        metric("shaft_arm_p7", "Shaft-Arm Stack (P7)", p7.get("stackDeg")),
    ]

    release_cliff = (shaft_arm.get("metrics") or {}).get("releaseCliff")
    finish_drop = (shaft_arm.get("metrics") or {}).get("finishDrop")

    valid = (
        status == "ok"
        and confidence_min >= 50
        and all(m.get("value") is not None for m in metrics)
    )

    interpretation = []
    if release_cliff is not None:
        if release_cliff < -8:
            interpretation.append(
                "Shaft-to-arm separation tightens materially from P5 to P6."
            )
        elif release_cliff > 8:
            interpretation.append(
                "Shaft-to-arm separation increases from P5 to P6."
            )
        else:
            interpretation.append(
                "Shaft-to-arm relationship stays relatively stable from P5 to P6."
            )
    if finish_drop is not None:
        if finish_drop < -8:
            interpretation.append(
                "Delivery stack tightens materially from P6 into impact."
            )
        elif finish_drop > 8:
            interpretation.append(
                "Delivery stack opens from P6 into impact."
            )
        else:
            interpretation.append(
                "Delivery stack remains organized from P6 into impact."
            )

    quality_reasons = []
    if status != "ok":
        quality_reasons.append(f"Shaft-arm status: {status}")
    if confidence_min < 50:
        quality_reasons.append(
            f"Minimum shaft confidence is {confidence_min}%; fine delivery angles are estimate-only."
        )

    return {
        "ok": True,
        "created": None,
        "title": "Measured Delivery: Shaft vs Lead Arm",
        "metrics": metrics,
        "deltas": {
            "p5_p6_stack_delta": release_cliff,
            "p6_p7_stack_delta": finish_drop,
        },
        "interpretation": interpretation,
        "frames": {
            "P5": p5.get("frame"),
            "P6": p6.get("frame"),
            "P7": p7.get("frame"),
        },
        "quality": {
            "isValid": valid,
            "label": "Measured" if valid else "Low confidence",
            "reasons": quality_reasons,
            "userMessage": (
                "Measured shaft and arm geometry passed the confidence gate."
                if valid
                else "Delivery geometry is available, but capture or shaft confidence is too low for fine-angle coaching."
            ),
        },
        "provenance": {
            "source": "vision_grip_anchor_v2+pose_video_robust",
            "confidenceMin": confidence_min,
            "note": "All displayed angles are measured shaft-vs-left-arm geometry. No clubface, path, loft, or force values are inferred here.",
        },
    }


def export_pframes(video, phase_map, out_dir, asset_base_url=""):
    import cv2

    frame_dir = os.path.join(out_dir, "pframes")
    os.makedirs(frame_dir, exist_ok=True)

    cap = cv2.VideoCapture(video)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video for P-frame export: {video}")

    base = str(asset_base_url or "").rstrip("/")
    frames = []
    try:
        for i in range(1, 11):
            key = f"P{i}"
            if key not in phase_map:
                continue
            frame = int(phase_map[key])
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame)
            ok, img = cap.read()
            if not ok:
                continue

            file_path = os.path.join(frame_dir, f"{key}.jpg")
            cv2.imwrite(file_path, img, [cv2.IMWRITE_JPEG_QUALITY, 90])
            image_url = f"{base}/{key}.jpg" if base else None

            frames.append(
                {
                    "p": i,
                    "label": key,
                    "frame": frame,
                    "imageUrl": image_url,
                    "thumbUrl": image_url,
                    "imageFile": file_path,
                }
            )
    finally:
        cap.release()

    return frames


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--outDir", required=True)
    ap.add_argument("--repo", default=str(Path(__file__).resolve().parents[2]))
    ap.add_argument("--poseModel", default="")
    ap.add_argument(
        "--assetBaseUrl",
        default="",
        help="Optional public base URL for exported P-frame images; P1.png etc are appended.",
    )
    ap.add_argument("--debug", action="store_true")
    args = ap.parse_args()

    video = os.path.abspath(args.video)
    out_dir = os.path.abspath(args.outDir)
    repo = os.path.abspath(args.repo)

    if not os.path.isfile(video):
        raise RuntimeError(f"Video not found: {video}")
    os.makedirs(out_dir, exist_ok=True)

    requested_pose_model = args.poseModel.strip()
    candidates = []
    if requested_pose_model:
        candidates.append(requested_pose_model)
    candidates.extend(
        [
            os.path.join(repo, "app", "api", "analyze-swing", "models", "pose_landmarker_full.task"),
            os.path.join(repo, "pose", "models", "pose_landmarker_lite.task"),
            r"E:\VCA\Cache\repo-moved\pose\model\pose_landmarker_full.task",
        ]
    )
    pose_candidates = []
    seen = set()
    for candidate in candidates:
        candidate = os.path.abspath(candidate)
        if candidate in seen or not os.path.isfile(candidate):
            continue
        seen.add(candidate)
        pose_candidates.append(candidate)

    pose_script = os.path.join(repo, "scripts", "pose_video_robust.py")
    pose_solutions_script = os.path.join(repo, "scripts", "pose_video_solutions_robust.py")
    phase_script = os.path.join(repo, "scripts", "worker", "vca_phase_map.py")
    p56_script = os.path.join(repo, "scripts", "worker", "p56_refine_geometry.py")
    shaft_script = os.path.join(repo, "scripts", "shaft", "vca_shaft_keyphases_v2.py")

    pose_path = os.path.join(out_dir, "pose_dense.json")
    preflight_pose_path = os.path.join(out_dir, "pose_preflight.json")
    phase_path = os.path.join(out_dir, "phase_frames_override.flat.json")
    phase_meta_path = os.path.join(out_dir, "phase_frames_meta.json")
    p56_path = os.path.join(out_dir, "p56_geometry_refinement.json")

    def usable_pose_frames(pose_obj):
        return sum(
            1
            for fr in (pose_obj.get("frames") or [])
            if isinstance(fr, dict) and len(fr.get("landmarks") or []) >= 17
        )

    # Fast capture gate: sample the clip before running dense pose/shaft analysis.
    # This catches report-screen recordings, wrong uploads, and clips without a visible golfer.
    if os.path.isfile(preflight_pose_path):
        os.remove(preflight_pose_path)

    preflight_cmd = [
        sys.executable,
        pose_solutions_script,
        "--in",
        video,
        "--out",
        preflight_pose_path,
        "--sample",
        "8",
        "--complexity",
        "1",
        "--det",
        "0.25",
        "--trk",
        "0.25",
    ]
    preflight_cp = subprocess.run(
        preflight_cmd,
        capture_output=True,
        text=True,
    )

    preflight_pose = {}
    if os.path.isfile(preflight_pose_path):
        try:
            preflight_pose = load_json(preflight_pose_path)
        except Exception:
            preflight_pose = {}

    preflight_total = len(preflight_pose.get("frames") or [])
    preflight_usable = usable_pose_frames(preflight_pose)
    preflight_ratio = (
        float(preflight_usable) / float(preflight_total)
        if preflight_total > 0
        else 0.0
    )
    preflight_ok = preflight_usable >= 3 and preflight_ratio >= 0.12

    print(
        f"CAPTURE_PREFLIGHT usable={preflight_usable} sampled={preflight_total} "
        f"ratio={preflight_ratio:.3f} ok={preflight_ok}"
    )

    if not preflight_ok:
        report_patch = {
            "analysisStatus": "invalid_capture",
            "analysisEngine": "local_worker_mvp_v1",
            "videoUrl": None,
            "sourceVideoFile": video,
            "pose": {
                "frames": [],
                "meta": {
                    "preflightSampled": preflight_total,
                    "preflightUsable": preflight_usable,
                    "preflightCoverage": round(preflight_ratio, 3),
                },
            },
            "phaseFrames": {},
            "phaseMeta": {
                "ok": False,
                "status": "invalid_capture",
                "reason": "insufficient_visible_golfer",
            },
            "pframes": [],
            "p5p6p7ShaftArm": None,
            "deliveryCard": None,
            "shaftV2": {
                "source": "unavailable",
                "measuredPhases": [],
                "requestedPhases": ["P2", "P3", "P5", "P6", "P7"],
                "phases": {},
                "why": "Capture preflight could not confirm a visible golfer across the clip.",
            },
            "recapture": {
                "required": True,
                "reason": "invalid_capture",
                "message": (
                    "We could not confirm a golfer in this video. Upload the original swing clip "
                    "with the full golfer visible from setup through early follow-through."
                ),
            },
            "meta": {
                "worker": {
                    "capturePreflight": {
                        "sampledFrames": preflight_total,
                        "usablePoseFrames": preflight_usable,
                        "coverage": round(preflight_ratio, 3),
                        "minimumUsableFrames": 3,
                        "minimumCoverage": 0.12,
                    }
                }
            },
        }

        patch_path = os.path.join(out_dir, "report_patch.json")
        with open(patch_path, "w", encoding="utf-8") as f:
            json.dump(report_patch, f, indent=2)

        print(
            json.dumps(
                {
                    "ok": True,
                    "analysisStatus": "invalid_capture",
                    "video": video,
                    "outDir": out_dir,
                    "reportPatch": patch_path,
                    "recapture": report_patch["recapture"],
                },
                indent=2,
            )
        )
        return

    # Fast temporal-scale gate. Slow-motion clips can preserve useful shape,
    # but millisecond-derived P5/P6 timing is not trustworthy when playback is scaled.
    preflight_geom = []
    for fr in preflight_pose.get("frames") or []:
        lm = fr.get("landmarks") or []
        if len(lm) < 25:
            continue
        try:
            i = int(fr.get("i", fr.get("frame", 0)))
            wx = (float(lm[15]["x"]) + float(lm[16]["x"])) / 2.0
            wy = (float(lm[15]["y"]) + float(lm[16]["y"])) / 2.0
            hx = (float(lm[23]["x"]) + float(lm[24]["x"])) / 2.0
            hy = (float(lm[23]["y"]) + float(lm[24]["y"])) / 2.0
        except Exception:
            continue
        preflight_geom.append(
            (i, wy, ((wx - hx) ** 2 + (wy - hy) ** 2) ** 0.5)
        )

    temporal = {
        "detected": False,
        "p4Frame": None,
        "p7Frame": None,
        "downswingSeconds": None,
        "wristDropNorm": None,
        "thresholdSeconds": 1.0,
        "minimumWristDropNorm": 0.08,
    }
    if len(preflight_geom) >= 6:
        preflight_meta = preflight_pose.get("meta") or {}
        frame_count = int(
            preflight_meta.get("frame_count")
            or (preflight_geom[-1][0] + 1)
        )
        fps = float(preflight_meta.get("fps") or 30.0)
        first_half = [
            r for r in preflight_geom if r[0] <= int(frame_count * 0.55)
        ]
        if not first_half:
            first_half = preflight_geom[: max(3, len(preflight_geom) // 2)]

        p4_row = max(first_half, key=lambda r: r[2])
        after = [r for r in preflight_geom if r[0] > p4_row[0]]
        if after:
            p7_row = max(after, key=lambda r: r[1])
            downswing_seconds = (
                float(p7_row[0] - p4_row[0]) / max(1e-6, fps)
            )
            wrist_drop = float(p7_row[1] - p4_row[1])
            slow_motion = downswing_seconds > 1.0 and wrist_drop >= 0.08
            temporal = {
                "detected": bool(slow_motion),
                "p4Frame": int(p4_row[0]),
                "p7Frame": int(p7_row[0]),
                "downswingSeconds": round(downswing_seconds, 3),
                "wristDropNorm": round(wrist_drop, 6),
                "thresholdSeconds": 1.0,
                "minimumWristDropNorm": 0.08,
            }

    if temporal["detected"]:
        report_patch = {
            "analysisStatus": "slow_motion_capture",
            "analysisEngine": "local_worker_mvp_v1",
            "videoUrl": None,
            "sourceVideoFile": video,
            "pose": {
                "frames": [],
                "meta": {
                    "preflightSampled": preflight_total,
                    "preflightUsable": preflight_usable,
                    "preflightCoverage": round(preflight_ratio, 3),
                },
            },
            "phaseFrames": {
                "P4": temporal["p4Frame"],
                "P7": temporal["p7Frame"],
            },
            "phaseMeta": {
                "ok": False,
                "status": "slow_motion_capture",
                "reason": "temporal_scale_not_realtime",
                "temporalPreflight": temporal,
            },
            "pframes": [],
            "p5p6p7ShaftArm": None,
            "deliveryCard": None,
            "shaftV2": {
                "source": "unavailable",
                "measuredPhases": [],
                "requestedPhases": ["P2", "P3", "P5", "P6", "P7"],
                "phases": {},
                "why": (
                    "The clip appears temporally slowed, so millisecond-derived "
                    "P5/P6 timing and shaft delivery are intentionally withheld."
                ),
            },
            "recapture": {
                "required": True,
                "reason": "slow_motion_capture",
                "message": (
                    "This video appears to be slow motion. Upload the original-speed "
                    "swing from setup through early follow-through so delivery timing "
                    "and shaft geometry can be measured accurately."
                ),
            },
            "meta": {
                "worker": {
                    "capturePreflight": {
                        "sampledFrames": preflight_total,
                        "usablePoseFrames": preflight_usable,
                        "coverage": round(preflight_ratio, 3),
                    },
                    "temporalPreflight": temporal,
                }
            },
        }

        patch_path = os.path.join(out_dir, "report_patch.json")
        with open(patch_path, "w", encoding="utf-8") as f:
            json.dump(report_patch, f, indent=2)

        print(
            json.dumps(
                {
                    "ok": True,
                    "analysisStatus": "slow_motion_capture",
                    "video": video,
                    "outDir": out_dir,
                    "reportPatch": patch_path,
                    "temporalPreflight": temporal,
                    "recapture": report_patch["recapture"],
                },
                indent=2,
            )
        )
        return

    selected_pose_model = None
    selected_pose_engine = None
    pose_failures = []

    # Primary: legacy MediaPipe Solutions tracker. It is materially more robust on
    # several archived VCA golf clips than the newer Tasks API.
    try:
        if os.path.isfile(pose_path):
            os.remove(pose_path)
        print("POSE_ENGINE_TRY mediapipe.solutions.pose")
        run(
            [
                sys.executable,
                pose_solutions_script,
                "--in",
                video,
                "--out",
                pose_path,
                "--sample",
                "1",
                "--complexity",
                "2",
                "--det",
                "0.1",
                "--trk",
                "0.1",
            ]
        )
        pose_probe = load_json(pose_path)
        non_empty = usable_pose_frames(pose_probe)
        if non_empty < 12:
            raise RuntimeError(
                f"Solutions pose engine produced only {non_empty} usable frames"
            )
        selected_pose_model = "mediapipe.solutions.pose"
        selected_pose_engine = "solutions"
        print(
            f"POSE_ENGINE_ACCEPT mediapipe.solutions.pose usableFrames={non_empty}"
        )
    except Exception as exc:
        pose_failures.append(
            {
                "engine": "solutions",
                "model": "mediapipe.solutions.pose",
                "error": str(exc).splitlines()[-1] if str(exc) else type(exc).__name__,
            }
        )
        print(
            f"POSE_ENGINE_REJECT mediapipe.solutions.pose: {pose_failures[-1]['error']}"
        )

    # Fallback: MediaPipe Tasks models.
    if not selected_pose_engine:
        if not pose_candidates:
            raise RuntimeError(
                "Solutions pose engine failed and no Tasks pose models were found"
            )

        pose_candidates.sort(key=os.path.getsize, reverse=True)
        for pose_model in pose_candidates:
            try:
                if os.path.isfile(pose_path):
                    os.remove(pose_path)
                print(f"POSE_MODEL_TRY {pose_model}")
                run(
                    [
                        sys.executable,
                        pose_script,
                        "--in",
                        video,
                        "--out",
                        pose_path,
                        "--model",
                        pose_model,
                        "--sample",
                        "1",
                    ]
                )
                pose_probe = load_json(pose_path)
                non_empty = usable_pose_frames(pose_probe)
                if non_empty < 12:
                    raise RuntimeError(
                        f"Pose model produced only {non_empty} usable frames"
                    )
                selected_pose_model = os.path.basename(pose_model)
                selected_pose_engine = "tasks"
                print(
                    f"POSE_MODEL_ACCEPT {pose_model} usableFrames={non_empty}"
                )
                break
            except Exception as exc:
                pose_failures.append(
                    {
                        "engine": "tasks",
                        "model": pose_model,
                        "error": str(exc).splitlines()[-1] if str(exc) else type(exc).__name__,
                    }
                )
                print(
                    f"POSE_MODEL_REJECT {pose_model}: {pose_failures[-1]['error']}"
                )

    if not selected_pose_engine:
        raise RuntimeError(
            "All pose engines failed: " + json.dumps(pose_failures)
        )

    run(
        [
            sys.executable,
            phase_script,
            "--pose",
            pose_path,
            "--video",
            video,
            "--out",
            phase_path,
            "--metaOut",
            phase_meta_path,
        ]
    )

    pose = load_json(pose_path)
    phase_map = load_json(phase_path)
    phase_meta = load_json(phase_meta_path)
    pose_frames_count = len(pose.get("frames") or [])
    pose_non_empty = usable_pose_frames(pose)

    if not bool(phase_meta.get("ok", False)):
        pframes = export_pframes(
            video,
            phase_map,
            out_dir,
            asset_base_url=args.assetBaseUrl,
        )
        phase_status = str(phase_meta.get("status") or "incomplete_swing")
        if phase_status == "partial_swing":
            shaft_why = "The clip begins after setup/address, so full P1-P10 timing and P5/P6 shaft delivery are unavailable."
            recapture_message = "Upload the complete swing beginning at address and continuing through impact and early follow-through."
        else:
            shaft_why = "Full downswing/impact evidence was not present in the clip."
            recapture_message = "Upload a clip that includes the complete backswing, downswing, impact, and early follow-through."

        report_patch = {
            "analysisStatus": phase_status,
            "analysisEngine": "local_worker_mvp_v1",
            "videoUrl": None,
            "sourceVideoFile": video,
            "pose": normalize_pose_for_report(pose),
            "phaseFrames": phase_map,
            "phaseMeta": phase_meta,
            "pframes": pframes,
            "p5p6p7ShaftArm": None,
            "deliveryCard": None,
            "shaftV2": {
                "source": "unavailable",
                "measuredPhases": [],
                "requestedPhases": ["P2", "P3", "P5", "P6", "P7"],
                "phases": {},
                "why": shaft_why,
            },
            "recapture": {
                "required": True,
                "reason": str(phase_meta.get("reason") or "incomplete_swing"),
                "message": recapture_message,
            },
            "meta": {
                "worker": {
                    "poseEngine": selected_pose_engine,
                    "poseModel": selected_pose_model,
                    "poseFrames": pose_frames_count,
                    "poseNonEmpty": pose_non_empty,
                    "phaseMap": phase_path,
                }
            },
        }

        patch_path = os.path.join(out_dir, "report_patch.json")
        with open(patch_path, "w", encoding="utf-8") as f:
            json.dump(report_patch, f, indent=2)

        print(json.dumps({
            "ok": True,
            "analysisStatus": report_patch["analysisStatus"],
            "video": video,
            "outDir": out_dir,
            "reportPatch": patch_path,
            "phases": phase_map,
            "recapture": report_patch["recapture"],
        }, indent=2))
        return

    run(
        [
            sys.executable,
            p56_script,
            "--video",
            video,
            "--phases",
            phase_path,
            "--out",
            p56_path,
            "--pose",
            pose_path,
            "--repo",
            repo,
            "--minConfidence",
            "0.60",
        ]
    )

    p56_refinement = load_json(p56_path)
    if not bool(p56_refinement.get("ok", False)):
        safe_phase_map = {
            key: value
            for key, value in phase_map.items()
            if key not in ("P5", "P6")
        }
        pframes = export_pframes(
            video,
            safe_phase_map,
            out_dir,
            asset_base_url=args.assetBaseUrl,
        )

        report_patch = {
            "analysisStatus": "p56_low_confidence",
            "analysisEngine": "local_worker_mvp_v1",
            "videoUrl": None,
            "sourceVideoFile": video,
            "pose": normalize_pose_for_report(pose),
            "phaseFrames": safe_phase_map,
            "phaseMeta": phase_meta,
            "pframes": pframes,
            "p5p6p7ShaftArm": None,
            "deliveryCard": None,
            "shaftV2": {
                "source": "unavailable",
                "measuredPhases": [],
                "requestedPhases": ["P2", "P3", "P5", "P6", "P7"],
                "phases": {},
                "why": (
                    "P5/P6 geometry confidence was below the production threshold, "
                    "so delivery shaft analysis was intentionally withheld."
                ),
            },
            "p56Refinement": p56_refinement,
            "recapture": {
                "required": True,
                "reason": "p56_low_confidence",
                "message": (
                    "We found the swing, but P5/P6 delivery geometry was not clear enough "
                    "for a high-confidence measurement. Re-record at original speed with the "
                    "full golfer and club visible through impact."
                ),
            },
            "meta": {
                "worker": {
                    "poseEngine": selected_pose_engine,
                    "poseModel": selected_pose_model,
                    "poseFrames": pose_frames_count,
                    "poseNonEmpty": pose_non_empty,
                    "phaseMap": phase_path,
                    "p56Refinement": p56_path,
                }
            },
        }

        patch_path = os.path.join(out_dir, "report_patch.json")
        with open(patch_path, "w", encoding="utf-8") as f:
            json.dump(report_patch, f, indent=2)

        print(
            json.dumps(
                {
                    "ok": True,
                    "analysisStatus": "p56_low_confidence",
                    "video": video,
                    "outDir": out_dir,
                    "reportPatch": patch_path,
                    "phases": safe_phase_map,
                    "p56Refinement": p56_refinement,
                    "recapture": report_patch["recapture"],
                },
                indent=2,
            )
        )
        return

    previous_p5 = phase_map.get("P5")
    previous_p6 = phase_map.get("P6")
    phase_map["P5"] = int(p56_refinement["P5"])
    phase_map["P6"] = int(p56_refinement["P6"])

    phase_meta["phases"] = dict(phase_map)
    provenance = phase_meta.setdefault("provenance", {})
    provenance["P5"] = {
        "source": "p56_geometry_model_v1",
        "confidence": float(p56_refinement["P5Confidence"]),
        "previousFrame": previous_p5,
        "geometryFrame": p56_refinement.get("geometryP5"),
        "timingPriorFrame": p56_refinement.get("timingPriorP5"),
        "fusionApplied": bool(p56_refinement.get("fusionAppliedP5", False)),
    }
    provenance["P6"] = {
        "source": "p56_geometry_model_v1",
        "confidence": float(p56_refinement["P6Confidence"]),
        "previousFrame": previous_p6,
        "geometryFrame": p56_refinement.get("geometryP6"),
        "timingPriorFrame": p56_refinement.get("timingPriorP6"),
        "fusionApplied": bool(p56_refinement.get("fusionAppliedP6", False)),
    }
    phase_meta["p56Refinement"] = p56_refinement

    with open(phase_path, "w", encoding="utf-8") as f:
        json.dump(phase_map, f, indent=2)
    with open(phase_meta_path, "w", encoding="utf-8") as f:
        json.dump(phase_meta, f, indent=2)

    pframes = export_pframes(
        video,
        phase_map,
        out_dir,
        asset_base_url=args.assetBaseUrl,
    )

    shaft_cmd = [
        sys.executable,
        shaft_script,
        "--shotDir",
        out_dir,
        "--video",
        video,
    ]
    if args.debug:
        shaft_cmd.append("--debug")
    run(shaft_cmd)

    shaft_path = newest(
        os.path.join(out_dir, "VCA_shaft_FINAL_V2_P2_P3_P5_P6_P7_*.json")
    )
    if shaft_path and shaft_path.endswith(".meta.json"):
        valid = [
            p
            for p in glob.glob(
                os.path.join(out_dir, "VCA_shaft_FINAL_V2_P2_P3_P5_P6_P7_*.json")
            )
            if not p.endswith(".meta.json")
        ]
        shaft_path = max(valid, key=os.path.getmtime) if valid else None

    if not shaft_path:
        raise RuntimeError("Shaft V2 output not found")

    pose = load_json(pose_path)
    phase_map = load_json(phase_path)
    phase_meta = load_json(phase_meta_path)
    shaft_rows = load_json(shaft_path)

    shaft_by = {row.get("phase"): row for row in shaft_rows if isinstance(row, dict)}
    measured = [
        p
        for p in ("P2", "P3", "P5", "P6", "P7")
        if shaft_by.get(p, {}).get("shaft", {}).get("source") != "unavailable"
        and int(shaft_by.get(p, {}).get("shaft", {}).get("confidenceRaw") or 0) > 0
    ]

    shaft_arm = build_shaft_arm_block(pose, shaft_by)
    delivery_card = build_delivery_card(shaft_arm)

    report_patch = {
        "analysisStatus": "measured_partial",
        "analysisEngine": "local_worker_mvp_v1",
        "videoUrl": None,
        "sourceVideoFile": video,
        "pose": normalize_pose_for_report(pose),
        "phaseFrames": phase_map,
        "phaseMeta": phase_meta,
        "p56Refinement": p56_refinement,
        "pframes": pframes,
        "p5p6p7ShaftArm": shaft_arm,
        "deliveryCard": delivery_card,
        "shaftV2": {
            "source": "vision_grip_anchor_v2",
            "measuredPhases": measured,
            "requestedPhases": ["P2", "P3", "P5", "P6", "P7"],
            "phases": shaft_by,
        },
        "meta": {
            "worker": {
                "poseEngine": selected_pose_engine,
                "poseModel": selected_pose_model,
                "poseFrames": pose_frames_count,
                "poseNonEmpty": pose_non_empty,
                "phaseMap": phase_path,
                "p56Refinement": p56_path,
                "shaftFile": shaft_path,
            }
        },
    }

    patch_path = os.path.join(out_dir, "report_patch.json")
    with open(patch_path, "w", encoding="utf-8") as f:
        json.dump(report_patch, f, indent=2)

    print(
        json.dumps(
            {
                "ok": True,
                "video": video,
                "outDir": out_dir,
                "reportPatch": patch_path,
                "phases": phase_map,
                "measuredShaftPhases": measured,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
