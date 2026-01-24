import { deterministicCoach } from "./deterministicCoach.js";
import { postAssess } from "./postAssess.js";
import { pickDrillsForFaults } from "../_logic/drills.js";

export function analyzeFromPoseJson(pose, opts = {}) {
  const frames = pose?.frames ?? [];
  const fps = pose?.fps ?? 30;

  const base = deterministicCoach({
    fps,
    framesCount: frames.length,
    sourceUrl: opts?.sourceUrl ?? "",
  });

  const assessed = postAssess({ pose, base });
  const faults = assessed?.faults ?? base?.faultKeys ?? [];
  const drills = pickDrillsForFaults(faults);

  return {
    ...base,
    ...assessed,
    drills,
    meta: {
      ...(base?.meta ?? {}),
      fps,
      framesCount: frames.length,
      sourceUrl: opts?.sourceUrl ?? "",
      builtAt: new Date().toISOString(),
      pipeline: "post-estimation-v1",
    },
  };
}
