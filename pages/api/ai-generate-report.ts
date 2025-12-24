import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body =
      typeof req.body === "string"
        ? (() => {
            try {
              return JSON.parse(req.body);
            } catch {
              return {};
            }
          })()
        : req.body || {};

    const report = {
      ok: true,
      mode: "demo",
      createdAt: new Date().toISOString(),
      profile: {
        playerName: body?.name || "Demo Player",
        email: body?.email || "demo@example.com",
        club: body?.club || "Driver",
        handedness: body?.hand || "right",
        notes: body?.notes || ""
      },
      scores: {
        swing: { grade: "B", score: 82 },
        power: { grade: "B-", score: 78 },
        efficiency: { grade: "B", score: 80 },
        reliability: { grade: "C+", score: 72 }
      },
      report: {
        summary: {
          headline: "Two priorities to tighten your strike and start line",
          bullets: [
            "Clubface slightly open relative to path at impact.",
            "Pressure shift is late into the lead side.",
            "Tempo quickens slightly in transition."
          ]
        },
        faults: [
          {
            name: "Late pressure shift",
            severity: "High",
            fix: "Step-through drills to lead heel"
          },
          {
            name: "Open face at impact",
            severity: "Medium",
            fix: "Half swings with early face closure"
          }
        ]
      }
    };

    return res.status(200).json(report);
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message || "Server error"
    });
  }
}
