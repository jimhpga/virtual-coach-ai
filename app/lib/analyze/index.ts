import type { ReportData } from "../reportTypes";
import { personalize } from "../personalize";
import { goldenFixture } from "./goldenFixture";

export function analyzeSwing(opts: { mode: "golden" | "upload"; intake?: any }): ReportData {
  const base = goldenFixture(); // today: fixture. tomorrow: replace with pose-based output.
  const merged = personalize(base, opts.intake);

  // Uncertainty protocol
  const lowCount = merged.faults.filter(f => f.confidence === "low").length;
  if (lowCount >= 1) {
    merged.narrative.uncertaintyNote =
      "Some findings are low-confidence from this clip angle/lighting. For a more precise diagnosis, add face-on and down-the-line clips.";
  }

  merged.meta.mode = opts.mode;
  merged.meta.generatedAt = new Date().toISOString();
  return merged;
}
