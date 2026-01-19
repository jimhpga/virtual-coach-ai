export function applyDeterministicCoaching(report: any) {
  if (!report || typeof report !== "object") return report;
  if (!Array.isArray(report.topFaults)) report.topFaults = [];

  // MVP defaults if no tags yet
  if (report.topFaults.length === 0) {
    report.topFaults = [
      { rank: 1, tag: "late_pressure_shift", title: "Pressure shift late", why: "Low point drifts back.", fix: "Get to lead side by P5–P6, then rotate.", severity: "NEEDS_ATTENTION" },
      { rank: 2, tag: "flip_risk", title: "Flip risk", why: "Handle stalls, hands flip.", fix: "Keep rotating through; handle forward.", severity: "NEEDS_ATTENTION" }
    ];
  }
  if (typeof report.swingScore !== "number") report.swingScore = 72;
  if (!report.headline) report.headline = "MVP coaching applied.";
  return report;
}
