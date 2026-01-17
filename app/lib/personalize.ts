import type { ReportData } from "./reportTypes";

function textify(x: any) {
  if (!x) return "";
  if (Array.isArray(x)) return x.join(" ").toLowerCase();
  return String(x).toLowerCase();
}

export function personalize(base: ReportData, intake: any): ReportData {
  if (!intake) return base;

  const out: ReportData = JSON.parse(JSON.stringify(base));

  // Attach intake if present
  out.intake = out.intake ?? {};
  out.intake.mobility = intake?.mobility ?? intake?.mobilityResults ?? out.intake.mobility ?? {};
  out.intake.limitations = intake?.limitations ?? intake?.limitationsList ?? out.intake.limitations ?? [];
  out.intake.goals = intake?.goals ?? intake?.goalsList ?? out.intake.goals ?? [];

  // Eye dominance
  const eye = String(intake?.eyeDominance ?? intake?.eye ?? intake?.dominantEye ?? "").toLowerCase();
  if (eye.includes("right")) out.player.eye = "right";
  else if (eye.includes("left")) out.player.eye = "left";

  const limText = textify(out.intake.limitations);

  const inserts: string[] = [];
  if (out.player.eye === "right") {
    inserts.push("Based on your screening (right-eye dominant): don’t over-turn your shoulders, and allow the head to release through the strike.");
  }

  if (limText.includes("touch toes") || limText.includes("hamstring")) {
    inserts.push("Mobility note: limited hinge/flexibility — we’ll prioritize setup, pressure shift, and a simpler backswing over extra depth.");
    out.narrative.topFixes = [
      "Clean up setup posture and ball position to reduce compensations",
      ...out.narrative.topFixes
    ].slice(0, 4);
  }

  if (limText.includes("neck")) {
    inserts.push("Mobility note: tight neck — keep the backswing shorter and rotate through instead of forcing extra turn.");
  }

  if (limText.includes("glute")) {
    inserts.push("Strength note: weak glutes — add a 2-minute glute activation warmup to stabilize the pelvis and improve pressure shift.");
    out.practicePlan.headline = out.practicePlan.headline + " Add 2 minutes of glute activation before swings.";
  }

  if (inserts.length) {
    out.narrative.overview = inserts.join(" ") + " " + out.narrative.overview;
  }

  return out;
}
