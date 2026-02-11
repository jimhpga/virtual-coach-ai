export function applyDeterministicCoaching(report: any) {
  if (!report || typeof report !== "object") return report;

  // ---------------------------
  // Stable schema defaults
  // ---------------------------
  if (!Array.isArray(report.topFaults)) report.topFaults = [];
  if (!Array.isArray(report.powerLeaks)) report.powerLeaks = [];
  if (!Array.isArray(report.topFixes)) report.topFixes = [];
  if (!Array.isArray(report.practicePlan)) report.practicePlan = [];

  // ---------------------------
  // Helpers
  // ---------------------------
  const cap = <T>(arr: T[] | any, n: number): T[] => (Array.isArray(arr) ? arr.slice(0, n) : []);
  const pick = <T>(arr: T[], n: number): T[] => cap(arr, n);

  const drill = (id: string, title: string, how: string, why: string) => ({ id, title, how, why });
  const fixItem = (key: string, title: string, cue: string, drills: any[]) => ({ key, title, cue, drills: cap(drills, 2) });

  // ---------------------------
  // Mini drill library (deterministic, reusable)
  // ---------------------------
  const DRILLS = {
    stepToLeadSide: drill(
      "step_to_lead_side",
      "Step-to-Lead-Side (timing)",
      "Make slow swings. As the club reaches the top, step into your lead foot before starting down. Then rotate through.",
      "Forces pressure shift before rotation so low point moves forward."
    ),
    pumpP6: drill(
      "pump_to_p6",
      "Pump to P6 (delivery)",
      "From the top, rehearse to lead-arm-parallel downswing (P5) and shaft-parallel downswing (P6), keeping chest turning. Do 5 reps then hit.",
      "Builds a repeatable slot + rotation pattern without throwing hands."
    ),
    impactBag: drill(
      "impact_bag",
      "Impact Bag (handle forward)",
      "Hit an impact bag with half-swings: hands ahead, chest turning, lead wrist flat. Freeze for 2 seconds.",
      "Trains forward shaft lean and stops the flip."
    ),
    towelUnderTrailArm: drill(
      "towel_trail_arm",
      "Towel Under Trail Arm",
      "Place a towel under your trail armpit and make 10 slow swings keeping it from falling until P6.",
      "Keeps arms connected so the chest can control the delivery."
    ),
    gateFaceControl: drill(
      "gate_face_control",
      "Face Control Gate",
      "Set two tees just wider than the clubhead. Hit half shots without clipping the tees. Keep the face stable through impact.",
      "Improves face control without adding manipulations."
    ),
    splitGrip: drill(
      "split_grip",
      "Split-Grip Swings",
      "Split your hands on the grip by 3-4 inches and make 8 smooth swings focusing on body rotation through.",
      "Reduces hand flip and teaches rotation-driven speed."
    ),
    chairButtLine: drill(
      "chair_butt_line",
      "Chair Butt-Line (early extension)",
      "Set a chair lightly behind your hips at setup. Make slow swings keeping your hips from moving into the chair early.",
      "Trains pelvis depth so you don't stand up and lose space."
    ),
    wallHipDepth: drill(
      "wall_hip_depth",
      "Wall Hip-Depth Rehearsal",
      "Stand with rear end near a wall. Turn back and through without letting hips drift toward the ball.",
      "Teaches depth + rotation instead of thrust."
    ),
    tempo321: drill(
      "tempo_3_2_1",
      "3-2-1 Tempo",
      "Count '3' backswing, '2' transition, '1' downswing. Keep it smooth for 10 balls.",
      "Stabilizes sequencing and contact under pressure."
    ),
    brushForwardLine: drill(
      "brush_forward_line",
      "Brush the Line (low point)",
      "Draw a line on turf. Make swings brushing the ground *in front* of the line, not behind it.",
      "Moves low point forward and improves compression."
    ),
    leadWristCheck: drill(
      "lead_wrist_check",
      "Lead Wrist Check (face/lean)",
      "At P6, pause and check lead wrist is flat/bowed slightly (not cupped). Then rotate through.",
      "Helps square face earlier and keep handle forward."
    ),
    rotateThroughFinish: drill(
      "rotate_finish",
      "Rotate to a Tall Finish",
      "Hit 8 shots finishing tall and posted on lead leg; belt buckle to target; hold the finish.",
      "Prevents stall + flip and improves speed transfer."
    ),
  };

  // ---------------------------
  // Fault -> Fix mapping
  // ---------------------------
  const FAULTS: Record<string, any> = {
    late_pressure_shift: {
      key: "late_pressure_shift",
      title: "Pressure shift late",
      why: "Low point drifts back and contact gets inconsistent.",
      cue: "Get to lead side by P5-P6, then rotate.",
      drills: [DRILLS.stepToLeadSide, DRILLS.brushForwardLine, DRILLS.tempo321],
      powerLeak: "If pressure stays back, you can't post and rotate hard through impact.",
    },
    flip_risk: {
      key: "flip_risk",
      title: "Flip risk",
      why: "Handle stalls and the hands try to save the face.",
      cue: "Keep the chest turning; handle forward through impact.",
      drills: [DRILLS.impactBag, DRILLS.splitGrip, DRILLS.rotateThroughFinish],
      powerLeak: "A flip bleeds speed and makes strike/face unpredictable.",
    },
    early_extension: {
      key: "early_extension",
      title: "Early extension",
      why: "Hips move toward the ball and you lose space.",
      cue: "Keep pelvis depth; rotate around your posture.",
      drills: [DRILLS.chairButtLine, DRILLS.wallHipDepth, DRILLS.pumpP6],
      powerLeak: "Losing space forces a last-second compensation and kills consistency.",
    },
    face_open: {
      key: "face_open",
      title: "Face slightly open",
      why: "Starting line right or weak cut shows up.",
      cue: "Square the face earlier; stabilize lead wrist.",
      drills: [DRILLS.gateFaceControl, DRILLS.leadWristCheck, DRILLS.splitGrip],
      powerLeak: "Open face makes you swing left to save it, robbing speed and strike.",
    },
    arms_overrun: {
      key: "arms_overrun",
      title: "Arms outrun the pivot",
      why: "Arms start down without the body, leading to stalls and flips.",
      cue: "Let the body start; keep arms connected through P6.",
      drills: [DRILLS.towelUnderTrailArm, DRILLS.pumpP6, DRILLS.tempo321],
      powerLeak: "When arms lead, the engine (pivot) can't deliver power on time.",
    },
    low_point_back: {
      key: "low_point_back",
      title: "Low point behind the ball",
      why: "Fat/thin and weak compression.",
      cue: "Pressure forward, then rotate to a posted finish.",
      drills: [DRILLS.brushForwardLine, DRILLS.stepToLeadSide, DRILLS.rotateThroughFinish],
      powerLeak: "Back low-point = no compression and no consistent ball speed.",
    },
  };

  // ---------------------------
  // Seed MVP defaults if no faults yet
  // ---------------------------
  if (report.topFaults.length === 0) {
    report.topFaults = [
      { rank: 1, tag: "late_pressure_shift", severity: "NEEDS_ATTENTION" },
      { rank: 2, tag: "flip_risk", severity: "NEEDS_ATTENTION" },
      { rank: 3, tag: "early_extension", severity: "WATCH" },
    ];
  }

  // Normalize + cap to top 3
  report.topFaults = cap(report.topFaults, 3).map((f: any, idx: number) => {
    const tag = String(f?.tag || f?.key || f?.fault || "").trim();
    const meta = FAULTS[tag] || null;

    return {
      rank: idx + 1,
      tag: tag || `fault_${idx + 1}`,
      key: meta?.key || tag || `fault_${idx + 1}`,
      title: meta?.title || String(f?.title || "Swing priority"),
      why: meta?.why || String(f?.why || "Improve contact and control."),
      fix: meta?.cue || String(f?.fix || "One clear focus for your next practice."),
      severity: String(f?.severity || "NEEDS_ATTENTION"),
    };
  });

  // ---------------------------
  // Build topFixes from topFaults (1 fix per fault)
  // ---------------------------
  report.topFixes = report.topFaults.map((f: any) => {
    const meta = FAULTS[String(f?.tag)] || null;
    const drills = meta?.drills ? pick(meta.drills, 2) : pick([DRILLS.tempo321, DRILLS.rotateThroughFinish], 2);
    return fixItem(String(f?.tag || f?.key), meta?.title || f?.title || "Fix", meta?.cue || f?.fix || "One simple cue.", drills);
  });

  // Cap topFixes to 3
  report.topFixes = cap(report.topFixes, 3);

  // ---------------------------
  // Power leaks (pick two most important)
  // ---------------------------
  const leaks = report.topFaults.slice(0, 2).map((f: any) => {
    const meta = FAULTS[String(f?.tag)] || null;
    const drills = meta?.drills ? pick(meta.drills, 2) : pick([DRILLS.tempo321, DRILLS.pumpP6], 2);
    return {
      key: String(f?.tag || f?.key),
      title: meta?.title || f?.title || "Power leak",
      why: meta?.powerLeak || "A sequencing or impact issue is bleeding speed.",
      drills: cap(drills, 2),
    };
  });
  report.powerLeaks = cap(leaks, 2);

  // ---------------------------
  // Practice plan (14-day simple plan)
  // ---------------------------
  const primaryFix = report.topFixes[0];
  const secondaryFix = report.topFixes[1];

  const day = (n: number, focus: string, reps: string) => ({ day: n, focus, reps });

  const plan: any[] = [];
  for (let d = 1; d <= 14; d++) {
    if (d % 7 === 0) {
      plan.push(day(d, "Test Day (film 2 swings + 10 balls)", "2 filmed swings, then 10 balls at 70% speed"));
      continue;
    }
    if (d <= 5) {
      plan.push(day(d, `Primary: ${primaryFix?.title || "Priority"}`, "10 reps drill A + 10 reps drill B + 8 balls"));
    } else if (d <= 10) {
      plan.push(day(d, `Blend: ${primaryFix?.title || "Primary"} + ${secondaryFix?.title || "Secondary"}`, "8 reps each drill + 12 balls"));
    } else {
      plan.push(day(d, "Performance: tempo + finish", "3-2-1 tempo for 8 balls + hold finish for 8 balls"));
    }
  }
  report.practicePlan = plan;

  
  // --- P1-P10: mark ONE checkpoint as NEEDS ATTENTION for collapsible focus ---
  try {
    const cps = Array.isArray((report as any).checkpoints) ? (report as any).checkpoints : [];
    if (cps.length) {
      const tag = String(((report as any).topFaults?.[0]?.tag ?? (report as any).topFaults?.[0]?.key ?? "")).toLowerCase();

      const map: Record<string, number> = {
        late_pressure_shift: 6,
        flip_risk: 7,
        early_extension: 6,
        face_open: 7,
      };

      const focusP = map[tag] ?? 6;
      const hit = cps.findIndex((c: any) => Number(c?.p) === focusP);
      if (hit >= 0) cps[hit].note = "NEEDS ATTENTION";
      else cps[0].note = "NEEDS ATTENTION";

      (report as any).checkpoints = cps;
    }
  } catch {}
return report;
}
