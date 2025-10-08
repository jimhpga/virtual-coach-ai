// /api/upload.js
export const config = { api: { bodyParser: false } };

function demoReport() {
  const now = new Date().toISOString();
  return {
    discipline: "full",
    swings: 12,
    phases: [
      { id: "P1", name: "Setup", grade: "good", short: "Neutral grip; 55/45", long: "Hip hinge ~25°, eyes level." },
      { id: "P2", name: "Shaft parallel (BS)", grade: "ok", short: "Face/spine match", long: "Club outside hands; path neutral." },
      { id: "P3", name: "Lead arm parallel", grade: "ok", short: "Lead wrist flat", long: "Slightly inside; width maintained." },
      { id: "P4", name: "Top", grade: "ok", short: "Trail elbow ~90°", long: "Full turn, no sway." },
      { id: "P5", name: "Transition", grade: "good", short: "Belt buckle leads", long: "Shallow 5–10°; sequence on time." },
      { id: "P6", name: "Delivery", grade: "good", short: "Under trail forearm", long: "Handle forward; path tight." },
      { id: "P7", name: "Impact", grade: "good", short: "85% lead", long: "Forward shaft lean; compression." },
      { id: "P8", name: "Trail arm parallel (FT)", grade: "good", short: "Arms extend", long: "Chest left of target." },
      { id: "P9", name: "Finish", grade: "good", short: "Balanced", long: "Tall, buckle at target." }
    ],
    coaching: {
      priority_fixes: [
        { title: "Face-to-Path Cleanup", short: "Lower left miss", long: "Neutralize closure rate; match path/face." },
        { title: "Tempo Consistency", short: "Even backswing", long: "Personal tempo metronome practice; 3:1." },
        { title: "Shallowing Start", short: "Early transition", long: "Shift/turn to shallow 5–10°; avoid dump." }
      ],
      power_fixes: [
        { title: "Lead-Leg Braking", short: "Post & turn", long: "Plant, post, rotate up/around to transfer torque." },
        { title: "X-Factor Stretch", short: "Sequence load", long: "Separate hips/torso slightly then fire." },
        { title: "Release Timing", short: "On time", long: "Deliver loft/face at P6–P7 without flip." }
      ]
    },
    position_metrics: [
      { p: "P1 Setup", value: 82, label: "P1 Setup" },
      { p: "P2 Shaft Parallel (BS)", value: 72, label: "P2 Shaft Parallel (BS)" },
      { p: "P6 Delivery", value: 86, label: "P6 Delivery" }
    ],
    swing_metrics: [
      { p: "Tempo", value: 76, label: "Tempo" },
      { p: "Face Control", value: 68, label: "Face Control" },
      { p: "Path Control", value: 71, label: "Path Control" }
    ],
    power: { score: 83, tempo: "3:1", release_timing: 78 },
    meta: { createdUtc: now }
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const report = demoReport();
    return res.status(200).json({ ok: true, report });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Upload processing failed." });
  }
}
