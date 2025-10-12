// api/report.js
export default async function handler(req, res) {
  try {
    const { key, demo } = req.query || {};
    if (!key) return res.status(400).json({ ok: false, error: "MISSING_KEY" });

    // If demo=1, return a populated fake report so the UI renders.
    if (String(demo) === "1") {
      return res.status(200).json({
        ok: true,
        videoKey: key,
        summary: { powerScore: 78, consistency: 72 },
        fundamentals: [
          "Balanced athletic setup with neutral grip",
          "Stable head and centered pivot",
          "Sequenced downswing: lower → torso → arms → club",
        ],
        errors: [
          "Trail elbow stuck behind torso",
          "Early extension reduces rotation",
          "Closed clubface at the top",
        ],
        quickFixes: [
          "Pump drill to keep trail elbow in front",
          "Wall-sit rotations for better pivot",
          "Lead-hand only swings for face control",
        ],
        expectations: [
          "More body rotation may shallow AOA → expect some grounders at first",
          "More forearm rotation → ball may start left until face control improves",
          "Tempo changes can cause thin/fat before it stabilizes",
        ],
        drills: [
          "Step-through swing (sequence & speed)",
          "Swing plane gate with tees",
          "Impact bag for shaft lean",
        ],
        badges: [
          { id: "consistency_70", label: "Consistency 70+" },
          { id: "fundamentals_3", label: "3 Fundamentals Logged" },
        ],
        coachCopy:
          "Nice progress. Keep the feels small and repeatable. Two buckets with the step-through drill, then film one swing to compare against your baseline.",
        deltas: { powerScore: +3, consistency: +5 },
      });
    }

    // No demo param → your real analyzer isn’t hooked up yet.
    // Keep returning NOT_READY so the client shows the pending state.
    return res.status(200).json({ ok: false, error: "NOT_READY" });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, error: "UNEXPECTED", details: String(e?.message || e) });
  }
}
