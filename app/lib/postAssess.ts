// app/lib/postAssess.ts
// Pure, deterministic post-assessment layer (safe to call in client).
// Keep it simple. No fetch. No randomness.

export type FaultKey = string;

export type AnalyzeResponse = {
  faults?: FaultKey[];
  scores?: { swing?: number; power?: number; reliability?: number };
  narrative?: any;
  drills?: any;
  media?: any;
};

const PRIORITY_ORDER: FaultKey[] = [
  "face_open",
  "face_closed",
  "early_extend",
  "over_the_top",
  "late_hips",
  "arms_start_down",
  "flip",
  "sway",
  "reverse_pivot",
];

function pickOne(faults: FaultKey[] = []) {
  for (const k of PRIORITY_ORDER) if (faults.includes(k)) return k;
  return faults[0] || "foundation";
}

function humanLabel(key: string) {
  const map: Record<string, string> = {
    face_open: "Clubface control (open)",
    face_closed: "Clubface control (closed)",
    over_the_top: "Path (over the top)",
    early_extend: "Posture (early extension)",
    late_hips: "Sequence (hips late)",
    arms_start_down: "Sequence (arms start down first)",
    flip: "Impact (handle stalls / flip)",
    sway: "Pressure shift (sway)",
    reverse_pivot: "Pressure shift (reverse pivot)",
    foundation: "Foundation (setup + contact)",
  };
  const k = (typeof key === "string") ? key : "";
  return (map as any)[k] || (k ? k.replace(/_/g, " ") : "");
}

export function postAssess(report: AnalyzeResponse) {
  const faults = report?.faults ?? [];
  const priority = pickOne(faults);

  const whyNow =
    priority === "foundation"
      ? "Lock in predictable contact first. Everything else gets easier once strike is stable."
      : `Fixing ${humanLabel(priority)} gives you the biggest “one move” gain right now—better starts, better strike, less chaos.`;

  const avoidList =
    priority === "face_open" || priority === "face_closed"
      ? "Avoid chasing swing path today. Face first, path second."
      : "Avoid chasing more speed today. Clean contact and sequence first.";

  const confidenceCue =
    "Expect a small confidence dip while you change the pattern. That’s normal—stay calm, take slower reps, and measure progress by contact + start line.";

  return {
    priorityKey: priority,
    priorityLabel: humanLabel(priority),
    whyNow,
    avoidList,
    confidenceCue,
  };
}

