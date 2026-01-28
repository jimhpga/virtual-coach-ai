import json, sys, math
from statistics import mean

def safe_mean(xs):
    xs = [x for x in xs if x is not None]
    return mean(xs) if xs else None

def extract_frames(data):
    if isinstance(data, dict):
        if "frames" in data and isinstance(data["frames"], list):
            return data["frames"]
        if "pose" in data and isinstance(data["pose"], list):
            return data["pose"]
    if isinstance(data, list):
        return data
    return None

def main(p):
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)

    frames = extract_frames(data)
    if not isinstance(frames, list) or not frames:
        print("QC: Could not find frames list in JSON.")
        return 2

    n = len(frames)
    missing = 0
    avg_vis = []
    avg_pres = []

    for fr in frames:
        lms = fr.get("landmarks") if isinstance(fr, dict) else None
        if not isinstance(lms, list) or len(lms) < 10:
            missing += 1
            continue
        vis = []
        pres = []
        for lm in lms:
            if isinstance(lm, dict):
                v = lm.get("visibility")
                p0 = lm.get("presence")
                if isinstance(v, (int, float)): vis.append(v)
                if isinstance(p0, (int, float)): pres.append(p0)
        avg_vis.append(safe_mean(vis))
        avg_pres.append(safe_mean(pres))

    miss_pct = round((missing / n) * 100, 2)
    vmean = safe_mean(avg_vis)
    pmean = safe_mean(avg_pres)

    print("=== POSE QC ===")
    print(f"Frames: {n}")
    print(f"Missing frames: {missing} ({miss_pct}%)")
    if vmean is not None: print(f"Mean visibility: {vmean:.3f}")
    if pmean is not None: print(f"Mean presence:   {pmean:.3f}")

    key_idxs = [15,16,23,24,27,28]  # wrists, hips, ankles
    deltas = []
    prev = None

    for fr in frames:
        lms = fr.get("landmarks") if isinstance(fr, dict) else None
        if not isinstance(lms, list) or len(lms) <= max(key_idxs):
            prev = None
            continue
        cur = []
        ok = True
        for i in key_idxs:
            lm = lms[i]
            if not isinstance(lm, dict) or "x" not in lm or "y" not in lm:
                ok = False
                break
            cur.append((lm["x"], lm["y"]))
        if not ok:
            prev = None
            continue
        if prev is not None:
            d = 0.0
            for (x0,y0),(x1,y1) in zip(prev,cur):
                d += math.hypot(x1-x0, y1-y0)
            deltas.append(d)
        prev = cur

    if deltas:
        print(f"Jitter proxy (mean sum keypoint delta): {mean(deltas):.4f}  (lower is better)")
    else:
        print("Jitter proxy: not computed (missing keypoints).")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv)>1 else ""))
