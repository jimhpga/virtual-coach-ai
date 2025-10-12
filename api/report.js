// api/report.js
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

/** read stream -> string */
const streamToString = async (stream) =>
  await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (c) => chunks.push(Buffer.from(c)));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const { key, demo } = req.query || {};
    if (!key) return res.status(400).json({ ok: false, error: "MISSING_KEY" });

    const {
      AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY,
      AWS_REGION = "us-west-1",
      S3_BUCKET = "virtualcoachai-swings",
      REPORTS_PREFIX = "reports",
    } = process.env;

    // For safety: only allow keys in uploads/
    if (!key.startsWith("uploads/")) {
      return res.status(400).json({ ok: false, error: "BAD_KEY" });
    }

    const s3 = new S3Client({
      region: AWS_REGION,
      credentials:
        AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
          ? { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY }
          : undefined, // allow IAM on Vercel Integration if present
    });

    const reportKey = `${REPORTS_PREFIX}/${key}.json`;

    // If ?demo=1 passed, synthesize a demo JSON (useful while testing)
    if (demo === "1" || demo === "true") {
      const demoJson = {
        ok: true,
        meta: {
          key,
          createdAt: new Date().toISOString(),
          mode: "Full Swing",
          swings: 8,
          heightInches: 70,
        },
        scores: { power: 72, consistency: 64 },
        fundamentals: ["Posture at P1", "Width at P3", "Chest open at P7"],
        errors: ["Steep at P6", "Face open vs path at P7", "Late rotation"],
        quickFixes: ["Toe-up checkpoint drill", "Alignment stick shallow drill", "Lead-arm rotation feel"],
        expectations: [
          "If you rotate body faster, AoA shallows — expect occasional ground balls at first.",
          "More forearm rotation can start ball left until timing settles.",
        ],
        drills: [
          "Pump drill to shallow from P5→P6",
          "Preset wrist/forearm rotation, hit 9-to-3",
          "Feet-together tempo swings",
        ],
        badges: [{ id: "first-upload", label: "First Upload" }, { id: "consistency-60", label: "Consistency 60+" }],
        coachVoice: "Great start — keep the feels small and hit 9-to-3 to lock in the new pattern.",
      };
      return res.status(200).json(demoJson);
    }

    // Check if report exists
    try {
      await s3.send(
        new HeadObjectCommand({
          Bucket: S3_BUCKET,
          Key: reportKey,
        })
      );
    } catch (e) {
      // Not found yet → still processing
      return res.status(202).json({ ok: false, error: "NOT_READY" });
    }

    // Return report JSON
    const out = await s3.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: reportKey,
      })
    );

    const body = await streamToString(out.Body instanceof Readable ? out.Body : Readable.from(out.Body));
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(body);
  } catch (err) {
    return res.status(500).json({ ok: false, error: "UNEXPECTED", details: String(err?.message || err) });
  }
}
