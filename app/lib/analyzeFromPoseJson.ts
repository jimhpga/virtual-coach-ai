import { deterministicCoach } from "./deterministicCoach";
import { postAssess } from "./postAssess";
import { pickDrillsForFaults } from "../_logic/drills";
import type { FaultKey } from "./postAssess";

// Minimal pose schema we rely on (matches your PoseOverlay2D typedefs)
export type PoseJson = {
  version?: number;
  fps?: number;
  width?: number;
  height?: number;
  frames?: any[];
  // allow extra keys
  [k: string]: any;
};

export function analyzeFromPoseJson(pose: PoseJson, opts?: { sourceUrl?: string }) {
  const frames = pose?.frames ?? [];
  const fps = pose?.fps ?? 30;

  // 1) Deterministic baseline report (stable defaults)
  // deterministicCoach() should return a stable report-shaped object
  const base = deterministicCoach({
    fps,
    framesCount: frames.length,
    sourceUrl: opts?.sourceUrl ?? "",
  });

  // 2) Post assessment: pick faults (top 2-3), confidence, etc.
  // postAssess() should tolerate missing/partial data.
  const assessed = postAssess({
    pose,
    base,
  });

  const faults: FaultKey[] = assessed?.faults ?? base?.faultKeys ?? [];

  // 3) Drill picks for those faults
  const drills = pickDrillsForFaults(faults);

  // 4) Compose final report payload
  // Keep it tolerant: the UI already guards arrays & missing fields.
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
