import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.SWINGS_BUCKET || "virtualcoachai-swings";
const REGION = process.env.AWS_REGION || "us-west-1";

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

export default async function handler(req, res) {
  try {
    const { key, demo } = req.query;

    // Demo payload so you can see a full report immediately
    if (demo === "1") {
      return res.status(200).json({
        meta: { name: "Jordan Smith", when: new Date().toISOString(), swings: 8 },
        summary: { mode: "Full Swing", notes: ["P6 — Shaft steep; handle high", "P7 — Face a bit open vs path"] },
        scores: { positionConsistency: 76, swingConsistency: 72, powerScore: 68 },
        fundamentals: ["Neutral grip", "Ball position forward of center", "Maintain posture"],
        powerErrors: ["Casting at P5.5", "Early extension", "Open face at P7"],
        quickFixes: ["Half-swings towel under trail arm", "Lead-hand only chips", "Pump drill P6 → P7"],
        faults: ["Over-the-top tendency", "Hip stall"],
        drills: ["Step-through drill", "Alignment stick gate", "Feet-together swings"],
        expectations: [
          "Rotate body faster → shallower AoA → expect some thins/grounders early.",
          "Increase forearm rotation → starts left until timing adapts."
        ],
        coachTone: "nice",
        baseline: { hasBaseline: false }
      });
    }

    if (!key) return res.status(400).json({ ok: false, error: "Missing key" });

    const s3 = new S3Client({ region: REGION });
    const jsonKey = `${key}.json`; // convention: report JSON next to the video

    const out = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: jsonKey }));
    const body = await streamToString(out.Body);
    res.setHeader("Content-Type", "application/json");
    return res.status(200).send(body);
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ ok: false, error: "NOT_READY" });
    }
    console.error("report api error", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}
