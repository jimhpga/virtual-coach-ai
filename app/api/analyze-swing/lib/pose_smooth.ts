/**
 * In-app pose smoothing (EMA) to reduce jitter in overlays & angle metrics.
 * Mirrors scripts/pose_smooth.py behavior conceptually:
 * - EMA with alpha (default 0.45)
 * - Handles short gaps by holding last good value up to maxGap
 * - Optional visibility/presence thresholds (default 0.0 = accept all)
 */

export type PoseLandmark = {
  x: number; y: number; z?: number;
  visibility?: number;
  presence?: number;
};

function isNum(v: any): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function okLm(lm: any, visMin: number, presMin: number): lm is PoseLandmark {
  if (!lm || typeof lm !== "object") return false;
  if (!isNum(lm.x) || !isNum(lm.y)) return false;
  const vis = isNum(lm.visibility) ? lm.visibility : 1.0;
  const pre = isNum(lm.presence) ? lm.presence : 1.0;
  return vis >= visMin && pre >= presMin;
}

function ema(prev: number, cur: number, alpha: number) {
  return alpha * cur + (1 - alpha) * prev;
}

export function smoothPoseFrames(
  frames: Array<{ landmarks?: PoseLandmark[] }>,
  alpha = 0.45,
  maxGap = 2,
  visMin = 0.0,
  presMin = 0.0
) {
  if (!Array.isArray(frames) || frames.length === 0) return frames;

  const out = frames.map(f => ({ ...f, landmarks: f.landmarks ? f.landmarks.map(l => ({ ...l })) : f.landmarks }));

  // Determine landmark count from first frame that has landmarks
  const first = out.find(f => Array.isArray(f.landmarks) && f.landmarks.length > 0);
  if (!first || !first.landmarks) return out;
  const K = first.landmarks.length;

  // Track prev smoothed landmark per index, and gap counters
  const prev: Array<PoseLandmark | null> = new Array(K).fill(null);
  const gap: number[] = new Array(K).fill(0);

  for (const fr of out) {
    const lms = fr.landmarks;
    if (!Array.isArray(lms) || lms.length !== K) {
      // reset on structure mismatch
      for (let i = 0; i < K; i++) { prev[i] = null; gap[i] = 0; }
      continue;
    }

    for (let i = 0; i < K; i++) {
      const lm = lms[i];
      if (!okLm(lm, visMin, presMin)) {
        // missing/low confidence: hold last for short gaps, else reset
        gap[i] += 1;
        if (prev[i] && gap[i] <= maxGap) {
          const base:any = (lm && typeof lm === "object") ? lm : {};
const zKeep = isNum(prev[i]!.z) ? prev[i]!.z : (isNum(base.z) ? base.z : 0);
lms[i] = { ...base, x: prev[i]!.x, y: prev[i]!.y, z: zKeep };
        } else {
          prev[i] = null;
        }
        continue;
      }

      // good landmark
      gap[i] = 0;
      if (!prev[i]) {
        prev[i] = { ...lm };
      } else {
        lms[i] = {
          ...lm,
          x: ema(prev[i]!.x, lm.x, alpha),
          y: ema(prev[i]!.y, lm.y, alpha),
          z: isNum(lm.z) && isNum(prev[i]!.z) ? ema(prev[i]!.z as number, lm.z as number, alpha) : lm.z
        };
        prev[i] = { ...lms[i] };
      }
    }
  }

  return out;
}

/**
 * Attempts to smooth known pose JSON shapes:
 * - { frames: [{landmarks:[...]}, ...] }
 * - { pose:   [{landmarks:[...]}, ...] }
 * - [ {landmarks:[...]}, ... ]
 */
export function smoothPoseJson(
  poseJson: any,
  alpha = 0.45,
  maxGap = 2,
  visMin = 0.0,
  presMin = 0.0
) {
  if (Array.isArray(poseJson)) {
    return smoothPoseFrames(poseJson, alpha, maxGap, visMin, presMin);
  }
  if (poseJson && typeof poseJson === "object") {
    if (Array.isArray(poseJson.frames)) {
      return { ...poseJson, frames: smoothPoseFrames(poseJson.frames, alpha, maxGap, visMin, presMin) };
    }
    if (Array.isArray(poseJson.pose)) {
      return { ...poseJson, pose: smoothPoseFrames(poseJson.pose, alpha, maxGap, visMin, presMin) };
    }
  }
  return poseJson;
}

