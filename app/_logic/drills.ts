export type FaultKey =
  | "late_hips"
  | "arms_start_down"
  | "early_extension"
  | "grip_in_palm_hinge_limited";

export type LevelKey = "beginner" | "intermediate" | "advanced";

export type Drill = {
  id: string;
  title: string;
  how: string[];
  reps: string;
  onCourseCue: string;
};

export type Prescription = {
  fault: FaultKey;
  bodyRequirement: string;
  drill: Drill;
};

const DRILLS: Record<string, Drill> = {
  SEQ_TURTLE_HARE: {
    id: "SEQ_TURTLE_HARE",
    title: "Turtle + Hare Transition (arms give the body a head start)",
    how: [
      "Make a backswing to lead-arm-parallel (P3) and pause for 1 beat.",
      "Start the downswing by shifting pressure left and bumping the lead hip 1-2 inches.",
      "Keep the arms 'quiet' for a split second while the lower body starts turning.",
      "Then let the arms fall-feel like they're arriving late on purpose."
    ],
    reps: "3 sets x 12 slow reps (mirror), then 20 balls at 60% speed.",
    onCourseCue: "Bump-left… THEN drop the arms."
  },

  HIP_EARLY_START: {
    id: "HIP_EARLY_START",
    title: "Left Hip Starts Before Arms Finish (the elite move)",
    how: [
      "Swing to the top at 70% speed.",
      "Before the backswing finishes, feel the lead hip glide slightly toward target.",
      "Hold the arms 'up' for a micro-beat while the pelvis begins to unwind.",
      "Hit punch shots first-then build to full swings."
    ],
    reps: "10 rehearsal swings + 15 punch balls + 15 full balls.",
    onCourseCue: "Lead hip starts while club is still going back."
  },

  POSTURE_WALL: {
    id: "POSTURE_WALL",
    title: "Posture Reset (fast win if posture is the limiter)",
    how: [
      "Stand with your butt 3-4 inches from a wall.",
      "Hinge at the hips until your glutes gently touch the wall-keep chest proud.",
      "Maintain that hip hinge and rotate slowly without losing the wall contact.",
      "Then do 10 slow swings keeping the hinge (no 'stand-up')."
    ],
    reps: "Daily: 5 minutes. Before practice: 2 minutes.",
    onCourseCue: "Stay hinged-rotate, don't pop."
  },

  HINGE_90_CHECK: {
    id: "HINGE_90_CHECK",
    title: "90° Hinge Check at P3 (fix grip-in-palm speed leak)",
    how: [
      "Grip check: lead hand more in fingers than palm (knuckles visible).",
      "Swing to lead-arm-parallel and STOP.",
      "Look for ~90° angle between lead forearm and shaft (hinge).",
      "If it's ~45°, reset grip and repeat until the hinge shows up."
    ],
    reps: "3 sets x 10 mirror reps + 20 balls focusing only on hinge.",
    onCourseCue: "Fingers grip… hinge early."
  }
};

const BODY_REQ: Record<FaultKey, string> = {
  late_hips: "Lead hip starts down early (lateral + unwind) before the arms fire.",
  arms_start_down: "Arms wait ~0.08-0.12s so the body can lead the race.",
  early_extension: "Maintain hip hinge longer; extend late (right before impact).",
  grip_in_palm_hinge_limited: "Lead hand more in fingers so the club can hinge to ~90°."
};

function pickDrillForFault(f: FaultKey): Drill {
  switch (f) {
    case "late_hips":
      return DRILLS.HIP_EARLY_START;
    case "arms_start_down":
      return DRILLS.SEQ_TURTLE_HARE;
    case "early_extension":
      return DRILLS.POSTURE_WALL;
    case "grip_in_palm_hinge_limited":
      return DRILLS.HINGE_90_CHECK;
    default:
      return DRILLS.SEQ_TURTLE_HARE;
  }
}

export function prescribe(args: {
  faults: FaultKey[];
  level: LevelKey;
  junior?: boolean;
}): Prescription[] {
  const uniq = Array.from(new Set(args.faults || []));
  const top = (uniq.length ? uniq : ["late_hips","arms_start_down"] as FaultKey[]).slice(0, 2);

  // Beginner: posture + sequencing. Advanced: sequencing + fault-specific.
  const ordered =
    args.level === "beginner"
      ? (["late_hips","arms_start_down"] as FaultKey[]).concat(top).slice(0, 2)
      : top;

  return ordered.map((f) => ({
    fault: f,
    bodyRequirement: BODY_REQ[f],
    drill: pickDrillForFault(f)
  }));
}
