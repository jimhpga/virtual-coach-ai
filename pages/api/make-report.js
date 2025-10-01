// pages/api/make-report.js
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-1";
const Bucket = process.env.S3_BUCKET;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Minimal sample viewer JSON (your real logic can replace this)
function sampleReport() {
  return {
    ok: true,
    status: "ready",
    header: { date: new Date().toISOString().slice(0,10), mode: "Full Swing", swings: 1 },
    summary: "Sample report: shallow earlier; tidy face-to-path.",
    p1ToP9: [{ p: "P6", note: "Shaft steep; handle high" }, { p: "P7", note: "Face a bit open vs path" }],
    positionConsistency: { overall: 74, by_position: [{ p: "P1", score: 82 }, { p: "P6", score: 63 }, { p: "P7", score: 70 }] },
    swingConsistency: { tempo: "3:1", variance: 6, stability: 82 },
    powerScoreSummary: { value: 68, total: 68, components: [{ name: "Levers", score: 72 }, { name: "Sequence", score: 65 }, { name: "Release", score: 67 }] },
    top3Fundamentals: [
      { label: "Shallow earlier (P3→P6)", delta: null, units: "deg" },
      { label: "Handle low/left through P6", delta: null, units: "deg" },
      { label: "Match face to path at P7", delta: null, units: "deg" },
    ],
    top3PowerErrors: [
      { label: "shaft steep", evidence: ["P6 +12°", "handle high"] },
      { label: "face to path open", evidence: ["P7 +3° open"] },
    ],
    top3QuickFixes: [{ label: "handle low/left" }, { label: "lead hip clears" }],
    drills: [
      { title: "SplitGrip_P3P6", cue: "handle low/left", steps: ["Split hands 2 in", "Slow P3→P6 keeping handle low-left"] },
      { title: "LeadArmWall", cue: "lead hip clears", steps: ["Lead side near wall", "Backswing: avoid wall; shallow first"] },
    ],
    power: { score: 68 },
    practicePlan: Array.from({ length: 14 }, (_, i) => ({ day: i + 1, focus: ["P6 shallow", "face control"] }))
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!Bucket) return res.status(500).json({ error: "S3_BUCKET not set" });

  // You can read req.body.s3_key, name, type, size here if needed
  const report = sampleReport();

  const id  = Date.now().toString(36);
  const Key = `reports/${id}.json`;

  await s3.send(new PutObjectCommand({
    Bucket, Key,
    Body: JSON.stringify(report),
    ContentType: "application/json; charset=utf-8",
  }));

  const signed = await getSignedUrl(s3, new GetObjectCommand({ Bucket, Key }), { expiresIn: 7 * 24 * 3600 });

  // Your viewer accepts ?report=<absolute-url>
  res.json({ ok: true, key: Key, viewerUrl: `/report?report=${encodeURIComponent(signed)}` });
}
