import json, sys
from copy import deepcopy

def is_num(x):
    return isinstance(x, (int, float))

def lerp(a, b, t):
    return a + (b - a) * t

def ema(vals, alpha):
    out = []
    prev = None
    for v in vals:
        if v is None:
            out.append(None)
            continue
        if prev is None:
            prev = v
        else:
            prev = alpha * v + (1 - alpha) * prev
        out.append(prev)
    return out

def fill_short_gaps(vals, max_gap):
    out = vals[:]
    n = len(out)
    i = 0
    while i < n:
        if out[i] is not None:
            i += 1
            continue
        start = i - 1
        j = i
        while j < n and out[j] is None:
            j += 1
        end = j
        gap = end - i
        if start >= 0 and end < n and gap <= max_gap and out[start] is not None and out[end] is not None:
            for k in range(i, end):
                t = (k - start) / (end - start)
                out[k] = lerp(out[start], out[end], t)
        i = end
    return out

def extract_frames(data):
    if isinstance(data, dict):
        if "frames" in data and isinstance(data["frames"], list):
            return data["frames"], "frames"
        if "pose" in data and isinstance(data["pose"], list):
            return data["pose"], "pose"
    if isinstance(data, list):
        return data, None
    return None, None

def main(inp, outp, alpha=0.35, max_gap=2, vis_min=0.0, pres_min=0.0):
    with open(inp, "r", encoding="utf-8") as f:
        data = json.load(f)

    frames, key = extract_frames(data)
    if not isinstance(frames, list) or not frames:
        print("Could not find frames list.")
        return 2

    # normalize to dict frames with "landmarks"
    norm = []
    for fr in frames:
        if isinstance(fr, dict):
            norm.append(fr)
        else:
            norm.append({"landmarks": fr})

    # landmark count
    lm_count = None
    for fr in norm:
        lms = fr.get("landmarks")
        if isinstance(lms, list) and lms:
            lm_count = len(lms)
            break
    if lm_count is None:
        print("No landmarks found.")
        return 3

    dims = ["x","y","z"]
    aux  = ["visibility","presence"]

    # collect series
    series = {(i,d): [] for i in range(lm_count) for d in (dims+aux)}

    for fr in norm:
        lms = fr.get("landmarks")
        if not isinstance(lms, list) or len(lms) != lm_count:
            for i in range(lm_count):
                for d in (dims+aux):
                    series[(i,d)].append(None)
            continue

        for i,lm in enumerate(lms):
            if not isinstance(lm, dict):
                for d in (dims+aux):
                    series[(i,d)].append(None)
                continue

            vis = lm.get("visibility")
            pres = lm.get("presence")
            ok_vis = (is_num(vis) and vis >= vis_min) if vis is not None else (vis_min <= 0.0)
            ok_pre = (is_num(pres) and pres >= pres_min) if pres is not None else (pres_min <= 0.0)
            ok = ok_vis and ok_pre

            for d in dims:
                v = lm.get(d)
                series[(i,d)].append(v if (ok and is_num(v)) else None)
            for d in aux:
                v = lm.get(d)
                series[(i,d)].append(v if is_num(v) else None)

    # smooth
    sm = {}
    for (i,d), vals in series.items():
        vals2 = fill_short_gaps(vals, max_gap=max_gap)
        a = alpha if d in dims else min(0.15, alpha)
        sm[(i,d)] = ema(vals2, a)

    # rebuild frames
    out_frames = []
    n = len(norm)
    for fi in range(n):
        fr = deepcopy(norm[fi])
        lms_out = []
        for i in range(lm_count):
            orig = {}
            if isinstance(fr.get("landmarks"), list) and len(fr["landmarks"])==lm_count and isinstance(fr["landmarks"][i], dict):
                orig = fr["landmarks"][i]
            lm1 = dict(orig)
            for d in dims + aux:
                v = sm[(i,d)][fi]
                if v is None:
                    continue
                lm1[d] = float(v)
            lms_out.append(lm1)
        fr["landmarks"] = lms_out
        fr["smoothed"] = {"alpha": alpha, "max_gap": max_gap, "vis_min": vis_min, "pres_min": pres_min}
        out_frames.append(fr)

    if isinstance(data, dict) and key:
        out_data = dict(data)
        out_data[key] = out_frames
    else:
        out_data = out_frames

    with open(outp, "w", encoding="utf-8") as f:
        json.dump(out_data, f)

    print(f"OK wrote: {outp}  frames:{len(out_frames)}  alpha:{alpha}  max_gap:{max_gap}  vis_min:{vis_min}  pres_min:{pres_min}")
    return 0

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("usage: pose_smooth.py in.json out.json [alpha] [max_gap] [vis_min] [pres_min]")
        sys.exit(2)
    inp = sys.argv[1]
    outp = sys.argv[2]
    alpha = float(sys.argv[3]) if len(sys.argv)>3 else 0.35
    max_gap = int(sys.argv[4]) if len(sys.argv)>4 else 2
    vis_min = float(sys.argv[5]) if len(sys.argv)>5 else 0.0
    pres_min = float(sys.argv[6]) if len(sys.argv)>6 else 0.0
    sys.exit(main(inp, outp, alpha=alpha, max_gap=max_gap, vis_min=vis_min, pres_min=pres_min))
