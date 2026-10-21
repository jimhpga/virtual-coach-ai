import argparse
import json
import math
import os
import subprocess
import tempfile
import wave
from pathlib import Path


def load_pose(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        data = json.load(f)
    frames = data.get("frames") or []
    fps = float((data.get("meta") or {}).get("fps") or data.get("fps") or 30.0)
    if not frames:
        raise RuntimeError("Pose file has no frames")
    return data, frames, fps


def frame_index(frame, fallback):
    for key in ("i", "frame"):
        if key in frame:
            try:
                return int(frame[key])
            except Exception:
                pass
    return fallback


def visibility(lm):
    for key in ("v", "visibility"):
        if key in lm:
            try:
                return float(lm[key])
            except Exception:
                pass
    return 1.0


def wrist_rows(frames):
    rows = []
    for k, fr in enumerate(frames):
        lm = fr.get("landmarks") or []
        if len(lm) < 17:
            continue
        if min(visibility(lm[15]), visibility(lm[16])) < 0.20:
            continue
        x = (float(lm[15]["x"]) + float(lm[16]["x"])) / 2.0
        y = (float(lm[15]["y"]) + float(lm[16]["y"])) / 2.0
        rows.append((frame_index(fr, k), x, y))
    if len(rows) < 12:
        raise RuntimeError("Not enough valid wrist frames for phase mapping")
    return rows




def body_geometry_rows(frames):
    rows = []
    for k, fr in enumerate(frames):
        lm = fr.get("landmarks") or []
        if len(lm) < 25:
            continue
        try:
            i = frame_index(fr, k)
            wx = (float(lm[15]["x"]) + float(lm[16]["x"])) / 2.0
            wy = (float(lm[15]["y"]) + float(lm[16]["y"])) / 2.0
            hx = (float(lm[23]["x"]) + float(lm[24]["x"])) / 2.0
            hy = (float(lm[23]["y"]) + float(lm[24]["y"])) / 2.0
        except Exception:
            continue
        hip_distance = math.hypot(wx - hx, wy - hy)
        wrist_vs_hip_y = wy - hy
        rows.append((i, wx, wy, hip_distance, wrist_vs_hip_y))
    return rows


def address_evidence(frames):
    rows = body_geometry_rows(frames)
    early = rows[:20]
    if len(early) < 5:
        return {
            "ok": False,
            "reason": "insufficient_early_pose",
            "hipDistanceMedian": None,
            "wristVsHipYMedian": None,
        }

    hip_distances = sorted(r[3] for r in early)
    wrist_rel = sorted(r[4] for r in early)
    hip_med = hip_distances[len(hip_distances) // 2]
    wrist_med = wrist_rel[len(wrist_rel) // 2]

    # Address-like setup: hands are close to the pelvis and below/near the hip center.
    # Mid-backswing clips begin with hands much farther from and above the pelvis.
    ok = hip_med <= 0.15 and wrist_med >= -0.02
    return {
        "ok": bool(ok),
        "reason": "address_visible" if ok else "clip_begins_after_address",
        "hipDistanceMedian": round(float(hip_med), 6),
        "wristVsHipYMedian": round(float(wrist_med), 6),
        "hipDistanceThreshold": 0.15,
        "wristVsHipYThreshold": -0.02,
    }


def partial_delivery_geometry(frames, frame_count, fps):
    rows = body_geometry_rows(frames)
    if len(rows) < 12:
        return {
            "ok": False,
            "reason": "insufficient_pose_for_partial_delivery",
        }

    first_half_limit = int(frame_count * 0.55)
    first_half = [r for r in rows if r[0] <= first_half_limit]
    if len(first_half) < 6:
        first_half = rows[: max(6, len(rows) // 2)]

    # At/near the top the hands are maximally separated from the hip center.
    p4_row = max(first_half, key=lambda r: r[3])
    after = [r for r in rows if r[0] > p4_row[0]]
    if len(after) < 5:
        return {
            "ok": False,
            "reason": "insufficient_frames_after_partial_top",
            "p4Frame": int(p4_row[0]),
        }

    # Through delivery the hands descend toward their image-space low point.
    p7_row = max(after, key=lambda r: r[2])
    delta_frames = int(p7_row[0] - p4_row[0])
    wrist_drop = float(p7_row[2] - p4_row[2])
    min_frames = max(5, round(0.18 * fps))
    min_drop = 0.08
    ok = delta_frames >= min_frames and wrist_drop >= min_drop

    return {
        "ok": bool(ok),
        "reason": "visible_partial_delivery" if ok else "no_material_partial_delivery",
        "p4Frame": int(p4_row[0]),
        "p7Frame": int(p7_row[0]),
        "deltaFrames": delta_frames,
        "minimumDeltaFrames": int(min_frames),
        "wristDropNorm": round(wrist_drop, 6),
        "minimumWristDropNorm": min_drop,
        "p4HipDistance": round(float(p4_row[3]), 6),
    }


def speeds(rows):
    out = []
    prev = None
    for i, x, y in rows:
        if prev is None:
            raw = 0.0
        else:
            _, px, py = prev
            raw = math.hypot(x - px, y - py)
        out.append([i, raw])
        prev = (i, x, y)

    smooth = []
    vals = [x[1] for x in out]
    for k, (i, raw) in enumerate(out):
        lo = max(0, k - 1)
        hi = min(len(vals), k + 2)
        smooth.append((i, sum(vals[lo:hi]) / max(1, hi - lo)))
    return out, smooth


def first_takeaway_onset(rows, smooth, search_end_frame):
    sdict = dict(smooth)
    candidates = [(i, sdict[i]) for i, _, _ in rows if i < search_end_frame]
    if len(candidates) < 8:
        return rows[0][0]

    early_vals = [v for i, v in candidates[: max(6, len(candidates) // 2)]]
    early_sorted = sorted(early_vals)
    med = early_sorted[len(early_sorted) // 2]
    threshold = max(0.006, med * 3.0)

    ids = [i for i, _ in candidates]
    for pos in range(2, len(ids) - 3):
        i = ids[pos]
        next_ids = ids[pos : pos + 3]
        if len(next_ids) < 3:
            break
        if all(sdict.get(q, 0.0) > threshold for q in next_ids):
            return ids[max(0, pos - 1)]

    # fallback: last local low speed before strong motion
    best = min(candidates[-max(6, len(candidates)//3):], key=lambda x: x[1])
    return best[0]


def refine_address_anchor(rows, onset):
    raw, _ = speeds(rows)
    raw_by = {i: float(v) for i, v in raw}
    ids = [i for i, _, _ in rows]
    if onset not in ids:
        return onset

    pos = ids.index(onset)
    lo = max(0, pos - 8)

    # Use the truly quiet pre-takeaway baseline, not the smoothed acceleration edge.
    # This keeps P1 contextual while leaving P4-P7 timing untouched.
    baseline_vals = [
        raw_by.get(ids[k], 0.0)
        for k in range(max(0, lo - 8), lo + 1)
    ]
    baseline_vals = sorted(baseline_vals)
    baseline_med = baseline_vals[len(baseline_vals) // 2] if baseline_vals else 0.0
    quiet_threshold = max(0.0015, baseline_med * 2.0)

    for k in range(pos - 1, lo - 1, -1):
        i = ids[k]
        if raw_by.get(i, 999.0) <= quiet_threshold:
            return i

    return onset


def local_top(rows, onset, fps):
    # Find the first strong wrist-height apex after takeaway, not a finish pose.
    # Use a local minimum in image-y with a short low-speed / reversal neighborhood.
    raw, smooth = speeds(rows)
    sdict = dict(smooth)
    valid = [(i, x, y) for i, x, y in rows if i >= onset + max(4, round(0.15 * fps))]
    if len(valid) < 8:
        raise RuntimeError("Not enough frames after takeaway for P4")

    # First, score local minima within a practical backswing horizon.
    horizon = onset + max(round(1.2 * fps), 18)
    local = []
    by_i = {i: (x, y) for i, x, y in rows}
    ids = [i for i, _, _ in valid if i <= horizon]
    for idx in range(2, len(ids) - 2):
        i = ids[idx]
        y = by_i[i][1]
        neighbors = [by_i[ids[idx + off]][1] for off in (-2, -1, 1, 2)]
        if y <= min(neighbors):
            local.append((i, y, sdict.get(i, 0.0)))

    if local:
        # prioritize height, then low local speed
        y_min = min(x[1] for x in local)
        near = [x for x in local if x[1] <= y_min + 0.018]
        return min(near, key=lambda x: (x[2], x[1]))[0]

    # fallback: highest hands in the horizon
    return min((r for r in valid if r[0] <= horizon), key=lambda r: r[2])[0]


def extract_audio_rms(video, fps, frame_count):
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.close()
    try:
        cp = subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error", "-i", video,
                "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", tmp.name,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        if cp.returncode != 0 or not os.path.isfile(tmp.name) or os.path.getsize(tmp.name) < 64:
            return []

        with wave.open(tmp.name, "rb") as w:
            sr = w.getframerate()
            raw = w.readframes(w.getnframes())
            sw = w.getsampwidth()
            if sw != 2:
                return []

        import array
        samples = array.array("h")
        samples.frombytes(raw)
        if not samples:
            return []

        samples_per_frame = sr / fps
        rows = []
        nframes = min(frame_count, int(len(samples) / samples_per_frame))
        for f in range(nframes):
            a = int(f * samples_per_frame)
            b = int((f + 1) * samples_per_frame)
            seg = samples[a:b]
            if not seg:
                continue
            rms = math.sqrt(sum(float(x) * float(x) for x in seg) / len(seg))
            peak = max(abs(int(x)) for x in seg)
            rows.append((f, rms, peak))
        return rows
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass


def downswing_evidence(rows, p4):
    by = {i: (x, y) for i, x, y in rows}
    if p4 not in by:
        return {
            "ok": False,
            "reason": "p4_frame_missing_from_pose",
            "wristDropNorm": 0.0,
            "threshold": 0.06,
        }

    p4_y = by[p4][1]
    after = [(i, y) for i, _, y in rows if i > p4]
    if len(after) < 4:
        return {
            "ok": False,
            "reason": "insufficient_frames_after_top",
            "wristDropNorm": 0.0,
            "threshold": 0.06,
        }

    max_i, max_y = max(after, key=lambda item: item[1])
    wrist_drop = float(max_y - p4_y)

    # A real delivery must move the hands materially downward in image space
    # after the backswing apex. This rejects top-only / backswing-only clips.
    threshold = 0.06
    ok = wrist_drop >= threshold

    return {
        "ok": ok,
        "reason": "downswing_present" if ok else "no_material_downswing_after_top",
        "p4WristY": round(float(p4_y), 6),
        "maxPostTopWristY": round(float(max_y), 6),
        "maxPostTopFrame": int(max_i),
        "wristDropNorm": round(wrist_drop, 6),
        "threshold": threshold,
    }


def impact_from_audio(video, fps, frame_count, p4):
    rows = extract_audio_rms(video, fps, frame_count)
    if not rows:
        return None

    lo = max(p4 + max(2, round(0.06 * fps)), 0)
    hi = min(p4 + max(8, round(0.55 * fps)), frame_count - 1)
    window = [r for r in rows if lo <= r[0] <= hi]
    if len(window) < 4:
        return None

    ranked = sorted(window, key=lambda r: r[1], reverse=True)
    best = ranked[0]
    second = ranked[1] if len(ranked) > 1 else (best[0], 1.0, 1)
    ratio = best[1] / max(1.0, second[1])

    # A very dominant transient is a strong golf-impact signature.
    confidence = min(0.99, 0.55 + 0.18 * max(0.0, ratio - 1.0))
    if ratio < 1.35:
        confidence *= 0.65

    return {
        "frame": int(best[0]),
        "rms": round(float(best[1]), 3),
        "peak": int(best[2]),
        "ratioToSecond": round(float(ratio), 3),
        "confidence": round(float(confidence), 3),
        "window": [lo, hi],
    }


def impact_from_wrist_speed(rows, p4, fps, frame_count):
    _, smooth = speeds(rows)
    candidates = [(i, v) for i, v in smooth if p4 + 1 <= i <= min(frame_count - 1, p4 + round(0.55 * fps))]
    if not candidates:
        return p4 + max(4, round(0.28 * fps)), 0.35
    peak_frame, _ = max(candidates, key=lambda x: x[1])
    p7 = min(frame_count - 1, peak_frame + max(1, round(0.10 * fps)))
    return p7, 0.45


def finish_frame(rows, p7, fps, frame_count):
    _, smooth = speeds(rows)
    vals = [(i, v) for i, v in smooth if i >= p7 + round(0.35 * fps)]
    if not vals:
        return min(frame_count - 1, p7 + round(0.65 * fps))
    # first 3-frame quiet region after the follow-through
    sdict = dict(vals)
    ids = [i for i, _ in vals]
    for k in range(0, len(ids) - 2):
        group = ids[k:k+3]
        if max(sdict[q] for q in group) < 0.010:
            return group[1]
    return min(frame_count - 1, ids[-1])


def clamp_frame(v, frame_count):
    return int(max(0, min(frame_count - 1, int(round(v)))))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pose", required=True)
    ap.add_argument("--video", required=True)
    ap.add_argument("--out", required=True, help="flat P1-P10 JSON")
    ap.add_argument("--metaOut", default="")
    args = ap.parse_args()

    data, frames, fps = load_pose(args.pose)
    rows = wrist_rows(frames)
    frame_count = int((data.get("meta") or {}).get("frame_count") or max(x[0] for x in rows) + 1)

    address = address_evidence(frames)
    if not address["ok"]:
        partial = partial_delivery_geometry(frames, frame_count, fps)
        if partial.get("ok"):
            partial_map = {
                "P4": clamp_frame(partial["p4Frame"], frame_count),
                "P7": clamp_frame(partial["p7Frame"], frame_count),
            }
            provenance = {
                "P4": {
                    "source": "partial_hip_distance_backswing_extent",
                    "confidence": 0.72,
                },
                "P7": {
                    "source": "partial_post_top_wrist_low_point",
                    "confidence": 0.65,
                },
            }
            status = "partial_swing"
            reason = "clip_begins_after_address"
            notes = [
                "The clip begins after setup/address, so P1-P3 are intentionally unavailable.",
                "Visible P4/P7 geometry is preserved as contextual anchors only.",
                "P5/P6 shaft-delivery analysis is intentionally withheld because the complete timing chain is not available.",
                "Upload the complete swing beginning at address for full P1-P10 analysis.",
            ]
        else:
            partial_map = {}
            if partial.get("p4Frame") is not None:
                partial_map["P4"] = clamp_frame(partial["p4Frame"], frame_count)
            provenance = {}
            if "P4" in partial_map:
                provenance["P4"] = {
                    "source": "partial_hip_distance_backswing_extent",
                    "confidence": 0.55,
                }
            status = "incomplete_swing"
            reason = str(partial.get("reason") or "missing_address_and_no_delivery")
            notes = [
                "The clip begins after setup/address and does not contain enough visible delivery to reconstruct a full swing.",
                "P1-P3 and P5-P10 are intentionally unavailable.",
                "Upload a complete swing beginning at address and continuing through early follow-through.",
            ]

        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(partial_map, indent=2), encoding="utf-8")

        meta_path = Path(args.metaOut) if args.metaOut else out_path.with_name("phase_frames_meta.json")
        meta = {
            "ok": False,
            "status": status,
            "reason": reason,
            "fps": fps,
            "frameCount": frame_count,
            "phases": partial_map,
            "provenance": provenance,
            "addressEvidence": address,
            "partialDelivery": partial,
            "notes": notes,
        }
        meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

        print(
            json.dumps(
                {
                    "ok": False,
                    "status": status,
                    "phaseMap": partial_map,
                    "addressEvidence": address,
                    "partialDelivery": partial,
                    "out": str(out_path),
                    "meta": str(meta_path),
                },
                indent=2,
            )
        )
        return

    # Preliminary onset using a broad first-half search, then solve P4.
    prelim_end = int(frame_count * 0.62)
    p1_pre = first_takeaway_onset(rows, speeds(rows)[1], prelim_end)
    p4 = local_top(rows, p1_pre, fps)
    p1_onset = first_takeaway_onset(rows, speeds(rows)[1], p4)
    p1 = refine_address_anchor(rows, p1_onset)

    completeness = downswing_evidence(rows, p4)
    if not completeness["ok"]:
        p2 = p1 + 0.43 * (p4 - p1)
        p3 = p1 + 0.78 * (p4 - p1)
        partial_map = {
            "P1": clamp_frame(p1, frame_count),
            "P2": clamp_frame(p2, frame_count),
            "P3": clamp_frame(p3, frame_count),
            "P4": clamp_frame(p4, frame_count),
        }

        provenance = {
            "P1": {"source": "wrist_takeaway_onset", "confidence": 0.82},
            "P2": {"source": "p1_p4_timing_interpolation", "confidence": 0.68},
            "P3": {"source": "p1_p4_timing_interpolation", "confidence": 0.72},
            "P4": {"source": "wrist_height_apex_candidate", "confidence": 0.55},
        }

        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(partial_map, indent=2), encoding="utf-8")

        meta_path = Path(args.metaOut) if args.metaOut else out_path.with_name("phase_frames_meta.json")
        meta = {
            "ok": False,
            "status": "incomplete_swing",
            "reason": completeness["reason"],
            "fps": fps,
            "frameCount": frame_count,
            "phases": partial_map,
            "provenance": provenance,
            "completeness": completeness,
            "notes": [
                "No material downswing was detected after the backswing apex candidate.",
                "P5-P10 are intentionally unavailable; the worker will not fabricate impact or delivery phases.",
                "Recapture or provide a clip containing the full downswing and impact.",
            ],
        }
        meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

        print(json.dumps({
            "ok": False,
            "status": "incomplete_swing",
            "phaseMap": partial_map,
            "completeness": completeness,
            "out": str(out_path),
            "meta": str(meta_path),
        }, indent=2))
        return

    audio = impact_from_audio(args.video, fps, frame_count, p4)
    if audio and audio["confidence"] >= 0.58:
        p7 = int(audio["frame"])
        p7_source = "audio_transient"
        p7_conf = float(audio["confidence"])
    else:
        p7, p7_conf = impact_from_wrist_speed(rows, p4, fps, frame_count)
        p7_source = "wrist_speed_fallback"

    # Measured anchors + timing-constrained derived phases.
    p2 = p1 + 0.43 * (p4 - p1)
    p3 = p1 + 0.78 * (p4 - p1)
    p5 = p7 - 0.150 * fps
    p6 = p7 - 0.070 * fps
    p8 = p7 + 0.100 * fps
    p9 = p7 + 0.220 * fps
    p10 = finish_frame(rows, p7, fps, frame_count)

    phase_map = {
        "P1": clamp_frame(p1, frame_count),
        "P2": clamp_frame(p2, frame_count),
        "P3": clamp_frame(p3, frame_count),
        "P4": clamp_frame(p4, frame_count),
        "P5": clamp_frame(p5, frame_count),
        "P6": clamp_frame(p6, frame_count),
        "P7": clamp_frame(p7, frame_count),
        "P8": clamp_frame(p8, frame_count),
        "P9": clamp_frame(p9, frame_count),
        "P10": clamp_frame(max(p10, p9), frame_count),
    }

    # Enforce strict order while preserving impact/top anchors as much as possible.
    keys = [f"P{i}" for i in range(1, 11)]
    for a, b in zip(keys, keys[1:]):
        if phase_map[b] <= phase_map[a]:
            phase_map[b] = min(frame_count - 1, phase_map[a] + 1)

    provenance = {
        "P1": {"source": "wrist_takeaway_onset", "confidence": 0.82},
        "P2": {"source": "p1_p4_timing_interpolation", "confidence": 0.68},
        "P3": {"source": "p1_p4_timing_interpolation", "confidence": 0.72},
        "P4": {"source": "wrist_height_apex", "confidence": 0.86},
        "P5": {"source": "impact_relative_-150ms", "confidence": max(0.55, p7_conf - 0.08)},
        "P6": {"source": "impact_relative_-70ms", "confidence": max(0.62, p7_conf - 0.05)},
        "P7": {"source": p7_source, "confidence": round(p7_conf, 3)},
        "P8": {"source": "impact_relative_+100ms", "confidence": 0.62},
        "P9": {"source": "impact_relative_+220ms", "confidence": 0.55},
        "P10": {"source": "post_impact_quiet_finish", "confidence": 0.55},
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(phase_map, indent=2), encoding="utf-8")

    meta_path = Path(args.metaOut) if args.metaOut else out_path.with_name("phase_frames_meta.json")
    meta = {
        "ok": True,
        "fps": fps,
        "frameCount": frame_count,
        "phases": phase_map,
        "provenance": provenance,
        "audioImpact": audio,
        "notes": [
            "P1/P4/P7 use independent measured signals when available.",
            "P5/P6 are impact-relative timing anchors; P5/P6/P7 retain highest downswing precision.",
            "P2/P3/P8/P9/P10 are contextual/derived and should not be presented as lab-grade timing.",
        ],
    }
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(json.dumps({
        "ok": True,
        "phaseMap": phase_map,
        "p7Source": p7_source,
        "p7Confidence": round(p7_conf, 3),
        "audio": audio,
        "out": str(out_path),
        "meta": str(meta_path),
    }, indent=2))


if __name__ == "__main__":
    main()
