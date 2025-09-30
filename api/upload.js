// /api/upload.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // We accept either FormData (file) or JSON ({ videoUrl, clientId, mode })
    // For now we ignore the actual bytes and produce a known-good demo report.
    const now = new Date().toISOString();

    const report = {
      schema: "1.0",
      title: "Virtual Coach AI - Swing Report",
      client: {
        id: "jim-hartnett",
        note: "Remote demo run",
        createdAt: now
      },
      session: {
        status: "ready",
        mode: "Full Swing",
        swings: 12,
        dateUtc: now
      },
      swingScore: 85,
      highlights: ["Hip clearance", "Face control", "Tempo"],
      faults: [
        { code: "face-to-path cleanup", severity: "med" },
        { code: "tempo inconsistency", severity: "low" }
      ],
      checkpoints: [
        { pos: "P1", label: "Setup", notes: "Neutral grip; hip hinge 25°; 55/45" },
        { pos: "P2", label: "Shaft parallel (BS)", notes: "Face matches spine-angle; path neutral" },
        { pos: "P3", label: "Lead arm parallel", notes: "Lead wrist flat; shaft slightly inside" },
        { pos: "P4", label: "Top", notes: "Trail elbow ~90°; full turn without sway" },
        { pos: "P5", label: "Transition", notes: "Belt buckle leads; shallow 5–10°" },
        { pos: "P6", label: "Delivery", notes: "Shaft under trail forearm; handle forward" },
        { pos: "P7", label: "Impact", notes: "Forward shaft lean; ~85% lead side" },
        { pos: "P8", label: "Trail arm parallel (FT)", notes: "Arms extend; chest left of target" },
        { pos: "P9", label: "Finish", notes: "Tall, balanced; buckle at target" }
      ]
    };

    // Return the report so the frontend can encode and redirect with it.
    return res.status(200).json({ ok: true, report });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Upload processing failed." });
  }
}
