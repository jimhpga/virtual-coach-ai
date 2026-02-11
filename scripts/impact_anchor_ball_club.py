import os, json, argparse, math
import cv2
import numpy as np

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

def read_frame(cap, idx):
    cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
    ok, bgr = cap.read()
    return ok, bgr

def find_ball_roi_early(cap, early_idxs, dbg_dir):
    """
    Try to find ball in early frames where it's stationary.
    Strategy:
      1) HoughCircles on blurred gray (white-ish ball)
      2) Fallback: brightest small blob near lower half
    Returns: (cx, cy, r, conf)
    """
    best = None  # (score, cx, cy, r, frame_idx)
    for i in early_idxs:
        ok, bgr = read_frame(cap, i)
        if not ok or bgr is None:
            continue

        h, w = bgr.shape[:2]
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

        # Focus on lower 65% of frame (ball on ground)
        y0 = int(h * 0.35)
        roi = gray[y0:h, 0:w].copy()

        roi_blur = cv2.GaussianBlur(roi, (9,9), 1.5)

        circles = cv2.HoughCircles(
            roi_blur,
            cv2.HOUGH_GRADIENT,
            dp=1.2,
            minDist=30,
            param1=120,
            param2=16,
            minRadius=2,
            maxRadius=18
        )

        if circles is not None:
            circles = np.round(circles[0, :]).astype(int)
            for (x, y, r) in circles:
                cx = int(x)
                cy = int(y + y0)
                # Score: brightness at center + small radius preference
                cx2 = clamp(cx, 0, w-1)
                cy2 = clamp(cy, 0, h-1)
                bright = int(gray[cy2, cx2])
                score = bright - (r * 0.5)
                if best is None or score > best[0]:
                    best = (score, cx, cy, r, i)

        # Fallback: brightest blob
        if best is None:
            # threshold high values (ball tends to be bright)
            _, th = cv2.threshold(roi_blur, 220, 255, cv2.THRESH_BINARY)
            th = cv2.morphologyEx(th, cv2.MORPH_OPEN, np.ones((3,3), np.uint8), iterations=1)
            cnts, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for c in cnts:
                area = cv2.contourArea(c)
                if area < 6 or area > 400:
                    continue
                x,y,wc,hc = cv2.boundingRect(c)
                cx = x + wc//2
                cy = y + hc//2 + y0
                # prefer lower-ish and near middle-ish
                score = 50 - abs(cy - int(h*0.80))*0.02 - abs(cx - int(w*0.50))*0.01
                if best is None or score > best[0]:
                    best = (score, cx, cy, max(wc,hc)//2, i)

    if best is None:
        return None

    score, cx, cy, r, fi = best
    conf = float(1.0 / (1.0 + math.exp(-score/20.0)))  # squashed
    # debug draw
    ok, bgr = read_frame(cap, fi)
    if ok:
        vis = bgr.copy()
        cv2.circle(vis, (cx, cy), max(6, int(r)), (0,255,0), 2)
        cv2.circle(vis, (cx, cy), 2, (0,255,0), -1)
        cv2.putText(vis, f"BALL@{fi} conf={conf:.2f}", (20,30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)
        cv2.imwrite(os.path.join(dbg_dir, f"ball_detect_frame_{fi}.png"), vis)

    return (int(cx), int(cy), int(max(6, r)), conf)

def roi_diff_energy(a_gray, b_gray, box):
    x1,y1,x2,y2 = box
    ra = a_gray[y1:y2, x1:x2]
    rb = b_gray[y1:y2, x1:x2]
    if ra.size == 0 or rb.size == 0:
        return 0.0
    d = cv2.absdiff(ra, rb)
    # count "changed" pixels
    _, th = cv2.threshold(d, 25, 255, cv2.THRESH_BINARY)
    return float(np.count_nonzero(th)) / float(th.size)

def motion_energy(a_gray, b_gray, box):
    x1,y1,x2,y2 = box
    ra = a_gray[y1:y2, x1:x2]
    rb = b_gray[y1:y2, x1:x2]
    if ra.size == 0 or rb.size == 0:
        return 0.0
    d = cv2.absdiff(ra, rb)
    _, th = cv2.threshold(d, 20, 255, cv2.THRESH_BINARY)
    return float(np.count_nonzero(th)) / float(th.size)
# --- constants (window around ball event for club scan) ---
CLUB_WINDOW_FRAMES = 30
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--outdir", required=True)
    ap.add_argument("--fps_hint", type=float, default=0.0)
    ap.add_argument("--early_frames", type=int, default=45)   # search ball in first N frames
    ap.add_argument("--ball_box", type=int, default=120)      # ROI size around ball
    ap.add_argument("--club_box", type=int, default=280)      # ROI size for club motion near ball
    ap.add_argument("--debug_every", type=int, default=0)     # set 25 to dump periodic debug frames
    args = ap.parse_args()

    # ---- scan window ----
    # --- fps + frame_count (robust) ---
# ensure fps is defined
try:
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
except Exception:
    fps = 0.0
if fps <= 0:
    fps = float(args.fps_hint) if hasattr(args, "fps_hint") and args.fps_hint else 25.0

# primary: OpenCV frame count
try:
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
except Exception:
    frame_count = 0

# Fallback: ask ffprobe for nb_read_frames / nb_frames / duration
if frame_count <= 0:
    try:
        import subprocess, json
        cmd = [
            "ffprobe","-v","error",
            "-select_streams","v:0",
            "-count_frames",
            "-show_entries","stream=nb_read_frames,nb_frames,duration",
            "-of","json",
            inp
        ]
        j = json.loads(subprocess.check_output(cmd, text=True, stderr=subprocess.STDOUT))
        st = (j.get("streams") or [{}])[0]
        nf = st.get("nb_read_frames") or st.get("nb_frames")
        if nf is not None:
            frame_count = int(float(nf))
        else:
            dur = float(st.get("duration") or 0.0)
            if dur > 0 and fps > 0:
                frame_count = int(round(dur * fps))
    except Exception:
        pass

if frame_count <= 0:
    raise RuntimeError("Could not determine frame_count (opencv+ffprobe both failed)")
# --- end robust init ---minF = max(1, int(getattr(args, "min_frame", 1)))
    maxF = int(getattr(args, "max_frame", -1))
    if maxF < 0 or maxF > (frame_count - 1):
        maxF = frame_count - 1
    if minF > maxF:
        minF = max(1, maxF - 1)
    os.makedirs(args.outdir, exist_ok=True)
    dbg_dir = os.path.join(args.outdir, "_dbg_impact")
    os.makedirs(dbg_dir, exist_ok=True)

    cap = cv2.VideoCapture(args.inp)
    if not cap.isOpened():
        print("ERROR: cannot open video")
        raise SystemExit(1)

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    if fps <= 0 and args.fps_hint > 0:
        fps = args.fps_hint
    if fps <= 0:
        fps = 25.0

    # ---- BALL DETECT (early) ----
    early = list(range(0, min(frame_count, args.early_frames)))
    # sample a bit (speed)
    early_idxs = sorted(set([0,1,2,3,4,5,10,15,20,25,30,35,40] + [i for i in early if i % 7 == 0]))
    ball = find_ball_roi_early(cap, early_idxs, dbg_dir)

    if ball is None:
        print("ERROR: could not find ball early.")
        raise SystemExit(2)

    cx, cy, r, ball_conf = ball
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)

    halfB = args.ball_box // 2
    halfC = args.club_box // 2

    ball_box = (
        clamp(cx - halfB, 0, w-1),
        clamp(cy - halfB, 0, h-1),
        clamp(cx + halfB, 1, w),
        clamp(cy + halfB, 1, h)
    )
    club_box = (
        clamp(cx - halfC, 0, w-1),
        clamp(cy - halfC, 0, h-1),
        clamp(cx + halfC, 1, w),
        clamp(cy + halfC, 1, h)
    )

    # ---- BALL DEPARTURE: diff spike in ball ROI ----
    # Build baseline from early stable segment
    baseline_vals = []
    prev_ok, prev = read_frame(cap, 0)
    if not prev_ok:
        print("ERROR: cannot read first frame")
        raise SystemExit(3)

    prevg = cv2.cvtColor(prev, cv2.COLOR_BGR2GRAY)

    for i in range(1, min(frame_count, args.early_frames)):
        ok, bgr = read_frame(cap, i)
        if not ok: break
        g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        e = roi_diff_energy(prevg, g, ball_box)
        baseline_vals.append(e)
        prevg = g

    base = float(np.median(baseline_vals)) if baseline_vals else 0.0
    base_mad = float(np.median(np.abs(np.array(baseline_vals) - base))) if baseline_vals else 0.0
    # threshold: baseline + k * mad + floor
    thr_ball = max(base + 8.0*base_mad, 0.015)

    # Scan whole video for first "persistent" spike
    ball_event = None  # (idx, score)
    ball_event_frame = None
    try:
        if ball_event is None:
            ball_event_frame = None
        elif isinstance(ball_event, (tuple, list)):
            ball_event_frame = int(ball_event[0])
        else:
            ball_event_frame = int(ball_event)
    except Exception:
        ball_event_frame = None

    club_start = 1
    club_end = frame_count - 1
    if ball_event_frame is not None:
        club_start = max(1, int(ball_event_frame) - CLUB_WINDOW_FRAMES)
        club_end   = min(frame_count - 1, int(ball_event_frame) + CLUB_WINDOW_FRAMES)
    club_start = 1
    club_end = frame_count - 1
    if ball_event is not None:
        # --- Normalize ball_event (can be tuple like (frame,score)) ---
        if isinstance(ball_event, (tuple, list)) and len(ball_event) > 0:
            ball_event = ball_event[0]
        if ball_event is None:
            club_start = 1
        else:
            club_start = max(1, int(ball_event) - CLUB_WINDOW_FRAMES)
        # --- Normalize ball_event again for end-window ---
        if isinstance(ball_event, (tuple, list)) and len(ball_event) > 0:
            ball_event = ball_event[0]
        if ball_event is None:
            club_end = frame_count - 1
        else:
            club_end = min(frame_count - 1, int(ball_event) + CLUB_WINDOW_FRAMES)
    persist = 0
    prev_ok, prev = read_frame(cap, 0)
    prevg = cv2.cvtColor(prev, cv2.COLOR_BGR2GRAY)

    ball_energy = []
    for i in range(club_start, club_end + 1):
        ok, bgr = read_frame(cap, i)
        if not ok: break
        g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        e = roi_diff_energy(prevg, g, ball_box)
        ball_energy.append((i, e))
        if e >= thr_ball:
            persist += 1
        else:
            persist = 0

        if persist >= 2 and ball_event is None:
            # candidate: take first frame of the spike run
            idx0 = i - 1
            ball_event = (idx0, float(e))
            ball_event_frame = None
            try:
                if ball_event is None:
                    ball_event_frame = None
                elif isinstance(ball_event, (tuple, list)):
                    ball_event_frame = int(ball_event[0])
                else:
                    ball_event_frame = int(ball_event)
            except Exception:
                ball_event_frame = None
            club_start = 1
            club_end = frame_count - 1
            if ball_event is not None:
                # --- Normalize ball_event (can be tuple like (frame,score)) ---
                if isinstance(ball_event, (tuple, list)) and len(ball_event) > 0:
                    ball_event = ball_event[0]
                if ball_event is None:
                    club_start = 1
                else:
                    club_start = max(1, int(ball_event) - CLUB_WINDOW_FRAMES)
                # --- Normalize ball_event again for end-window ---
                if isinstance(ball_event, (tuple, list)) and len(ball_event) > 0:
                    ball_event = ball_event[0]
                if ball_event is None:
                    club_end = frame_count - 1
                else:
                    club_end = min(frame_count - 1, int(ball_event) + CLUB_WINDOW_FRAMES)
            break

        prevg = g

    # ---- CLUB MOTION PEAK: motion energy in club ROI ----
    prev_ok, prev = read_frame(cap, 0)
    prevg = cv2.cvtColor(prev, cv2.COLOR_BGR2GRAY)

    peak_idx = 0
    peak_val = -1.0
    # scan all frames; you can window later around ball_event if you want
    for i in range(club_start, club_end + 1):
        ok, bgr = read_frame(cap, i)
        if not ok: break
        g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        m = motion_energy(prevg, g, club_box)
        if m > peak_val:
            peak_val = m
            peak_idx = i
        if args.debug_every and (i % args.debug_every == 0):
            vis = bgr.copy()
            x1,y1,x2,y2 = club_box
            cv2.rectangle(vis, (x1,y1), (x2,y2), (255,0,0), 2)
            cv2.putText(vis, f"clubM={m:.3f}", (20,30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,0,0), 2)
            cv2.imwrite(os.path.join(dbg_dir, f"dbg_club_{i:04d}.png"), vis)
        prevg = g

    # ---- Confidence + fuse ----
    # Ball confidence: if we found a departure event and it is strong relative to threshold
    if ball_event is None:
        ball_event_idx = None
        ball_event_strength = 0.0
        ball_event_conf = 0.0
    else:
        # Normalize ball_event to (idx, strength)
        # Some detectors return int idx; others return (idx, strength) / [idx] / [idx,strength]
        ball_event_idx = None
        ball_event_strength = 0.0
        try:
            if isinstance(ball_event, (tuple, list)):
                if len(ball_event) >= 2:
                    ball_event_idx = int(ball_event[0])
                    ball_event_strength = float(ball_event[1])
                elif len(ball_event) == 1:
                    ball_event_idx = int(ball_event[0])
                    ball_event_strength = 0.0
                else:
                    ball_event_idx, ball_event_strength = None, 0.0
            else:
                # assume scalar frame index
                ball_event_idx = int(ball_event)
                ball_event_strength = 0.0
        except Exception:
            ball_event_idx, ball_event_strength = None, 0.0
        # conf grows as strength exceeds threshold
        ball_event_conf = float(clamp((ball_event_strength - thr_ball) / max(1e-6, thr_ball), 0.0, 1.0))

    # Club confidence: peak sharpness vs median
    # Use a quick neighborhood to compare peak to median
    # (if peak is barely above median, it's not meaningful)
    club_conf = 0.0
    # approximate median from a small sample to keep it quick
    # (we could store all m's but fine)
    # Here: reuse peak_val against a nominal floor
    club_conf = float(clamp((peak_val - 0.01) / 0.10, 0.0, 1.0))

    # Fuse rule:
    # If ball_event exists and within 3 frames of club peak => mean
    # Else prefer whichever has higher confidence
    if ball_event_idx is not None and abs(ball_event_idx - peak_idx) <= 3:
        impact_idx = int(round((ball_event_idx + peak_idx) / 2.0))
        fuse = "mean(ball,club)"
    else:
        if ball_event_conf >= club_conf and ball_event_idx is not None:
            impact_idx = int(ball_event_idx)
            fuse = "ball_preferred"
        else:
            impact_idx = int(peak_idx)
            fuse = "club_preferred"

    # ---- Debug visuals at key frames ----
    def save_dbg(idx, name):
        ok, bgr = read_frame(cap, idx)
        if not ok or bgr is None: return
        vis = bgr.copy()
        x1,y1,x2,y2 = ball_box
        cv2.rectangle(vis, (x1,y1), (x2,y2), (0,255,0), 2)
        x1,y1,x2,y2 = club_box
        cv2.rectangle(vis, (x1,y1), (x2,y2), (255,0,0), 2)
        cv2.circle(vis, (cx,cy), 4, (0,255,0), -1)
        cv2.putText(vis, name, (20,30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255,255,255), 2)
        cv2.imwrite(os.path.join(dbg_dir, f"{name}_{idx:04d}.png"), vis)

    save_dbg(0, "frame0")
    if ball_event_idx is not None:
        save_dbg(ball_event_idx, "ball_event")
    save_dbg(peak_idx, "club_peak")
    save_dbg(impact_idx, "impact_final")

    cap.release()

    out = {
        "video": args.inp,
        "meta": {
            "fps": fps,
            "frame_count": frame_count,
            "w": w,
            "h": h
        },
        "ball": {
            "cx": cx, "cy": cy, "r": r,
            "detect_conf": ball_conf,
            "roi_box": {"x1": ball_box[0], "y1": ball_box[1], "x2": ball_box[2], "y2": ball_box[3]},
            "baseline": base,
            "baseline_mad": base_mad,
            "thr_ball": thr_ball,
            "event_frame": ball_event_idx,
            "event_strength": ball_event_strength,
            "event_conf": ball_event_conf
        },
        "club": {
            "roi_box": {"x1": club_box[0], "y1": club_box[1], "x2": club_box[2], "y2": club_box[3]},
            "peak_frame": peak_idx,
            "peak_val": peak_val,
            "conf": club_conf
        },
        "impact": {
            "P7_frame": impact_idx,
            "fuse": fuse
        }
    }

    with open(os.path.join(args.outdir, "impact_anchor.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)

    print(f"OK impact_anchor.json P7={impact_idx} fuse={fuse} ballEvent={ball_event_idx} clubPeak={peak_idx}")

if __name__ == "__main__":
    main()