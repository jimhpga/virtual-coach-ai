import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const REGION = process.env.AWS_REGION || "us-west-2";
const BUCKET = process.env.S3_UPLOAD_BUCKET || "";

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

function baseKey(k=""){ return String(k).replace(/\.[a-z0-9]+$/i, ""); }

export default async function handler(req, res) {
  const key = String(req.query.key || "").trim();
  if (!key) { res.status(400).json({ error: "Missing key" }); return; }
  if (!BUCKET) { res.status(500).json({ error: "S3 bucket not configured" }); return; }

  try {
    const reportKey = `${baseKey(key)}.report.json`;
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: reportKey }))
      .catch(() => { throw { code: "NO_REPORT" }; });

    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: reportKey }));
    const txt = await obj.Body.transformToString();
    let report; try { report = JSON.parse(txt); } catch { report = { raw: txt }; }

    const status = (report && typeof report.status === "string") ? report.status : "ready";
    if (status !== "ready") { res.status(200).json({ status }); return; }

    res.status(200).json({ status: "ready", report });
  } catch (e) {
    if (e && e.code === "NO_REPORT") { res.status(200).json({ status: "pending" }); return; }
    res.status(500).json({ error: String(e.message || e) });
  }
}
