import type { ReportData } from "../reportTypes";

export function goldenFixture(): ReportData {
  const now = new Date().toISOString();
  return {
    player: { name: "PLAYER OVERVIEW", hand: "right", eye: "unknown", hcp: 6, notes: "Demo swing" },
    intake: { mobility: {}, limitations: [], goals: [] },
    scores: { overallGrade: "A-", speed: 86, efficiency: 81, consistency: 84 },
    narrative: {
      overview: "Solid fundamentals and athletic motion. Biggest gains now come from cleaning up transition timing and low-point control.",
      quickHighlights: [
        "Athletic, balanced setup with good coil potential",
        "Good wrist hinge and width in the backswing",
        "Clubface control is generally solid through impact"
      ],
      topFixes: [
        "Get to your left side before you rotate",
        "Clean the hips up first, then let the arms fall (don't rush from the top)",
        "Shallow slightly in downswing to improve compression"
      ],
      powerLeaks: [
        "Early extension reduces leverage and steals compression",
        "Upper body starts down too early which steepens delivery"
      ],
      doingWell: [
        "Good contact pattern when tempo is controlled",
        "Solid coil/turn and athletic posture",
        "Hands work well when the body keeps rotating"
      ],
      uncertaintyNote: undefined
    },
    faults: [
      {
        id: "late-hips",
        title: "Sequence: hips late in transition",
        summary: "Upper body starts down before pressure shifts, creating a steep, inconsistent strike.",
        whyItMatters: "Sequence issues reduce speed and make low point unpredictable.",
        confidence: "medium",
        evidence: ["P4→P5: arms initiate while pelvis stalls", "Downswing plane steepens under pressure"],
        fixes: ["Step-through transition drill", "Pause-at-top then bump-left"]
      },
      {
        id: "early-extension",
        title: "Posture: early extension",
        summary: "Pelvis moves toward the ball, raising the handle and losing compression.",
        whyItMatters: "Compression and face control get harder when posture stands up early.",
        confidence: "low",
        evidence: ["P6: chest rises and hips move closer to ball"],
        fixes: ["Chair/hip hinge drill", "Wall-butt drill"]
      }
    ],
    checkpoints: [
      { p: 1, title: "Setup", coachNotes: "Balanced, athletic posture with clean alignments.", commonMisses: ["Too much knee bend can restrict hip turn."], keyDrills: ["Mirror setup check: spine tilt, ball position, weight 55/45."], status: "on_track", confidence: "high" },
      { p: 2, title: "Shaft parallel backswing", coachNotes: "Takeaway is stable with decent face control.", commonMisses: ["Rolling inside early with forearm rotation."], keyDrills: ["Low-and-slow takeaway keeping the triangle."], status: "on_track", confidence: "high" },
      { p: 3, title: "Lead arm parallel backswing", coachNotes: "Good width and structure.", commonMisses: ["Lead arm collapsing and losing width."], keyDrills: ["Towel under arms to maintain structure."], status: "on_track", confidence: "medium" },
      { p: 4, title: "Top of swing", coachNotes: "Playable position at the top.", commonMisses: ["Over-long backswing when tempo gets fast."], keyDrills: ["3-count backswing to control length."], status: "on_track", confidence: "medium" },
      { p: 5, title: "Lead arm parallel downswing", coachNotes: "Can get steep under pressure.", commonMisses: ["Upper body diving early."], keyDrills: ["Pump drill: arms drop as pressure shifts."], status: "needs_attention", confidence: "medium" },
      { p: 6, title: "Shaft parallel downswing", coachNotes: "Steepness can steal compression.", commonMisses: ["Handle too high into impact."], keyDrills: ["Headcover outside ball to encourage inside path."], status: "needs_attention", confidence: "low" },
      { p: 7, title: "Impact", coachNotes: "Generally square with decent shaft lean.", commonMisses: ["Low-point drift causing heel/toe strikes."], keyDrills: ["Divot-forward line drill."], status: "on_track", confidence: "medium" },
      { p: 8, title: "Trail arm parallel follow-through", coachNotes: "Good extension when the body keeps rotating.", commonMisses: ["Arms outracing body and flipping."], keyDrills: ["Hold P8 for 2 seconds."], status: "on_track", confidence: "high" },
      { p: 9, title: "Finish", coachNotes: "Balanced finish with weight left.", commonMisses: ["Falling back / losing posture."], keyDrills: ["3-second finish holds."], status: "on_track", confidence: "high" }
    ],
    practicePlan: {
      headline: "Next 14 days: lock in transition sequence, shallow slightly, and keep great fundamentals.",
      days: [
        { day: 1, focus: "Transition sequence", reps: "3x10 Step-through drill + 10 swings", note: "Film 2 swings to confirm shallower delivery." },
        { day: 2, focus: "Low point", reps: "2x12 Divot-forward drill + 10 swings" },
        { day: 3, focus: "Tempo", reps: "3x8 3-count backswing + 12 swings" }
      ]
    },
    meta: { mode: "golden", generatedAt: now }
  };
}
