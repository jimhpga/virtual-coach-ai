import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const REGION = process.env.AWS_REGION || "us-west-2";
const BUCKET = process.env.S3_UPLOAD_BUCKET || "";

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

const baseKey = k => String(k||"").replace(/\.[a-z0-9]+$/i,"");

export default async function handler(req, res) {
  if (req.method === "GET" || req.method === "HEAD")
    return res.status(200).json({ ok:true, expects:"POST { key, report }" });
  if (req.method !== "POST")
    return res.status(405).json({ error:"Method Not Allowed", allow:"GET,HEAD,POST" });

  if (!BUCKET) return res.status(500).json({ error:"S3 bucket not configured" });

  try {
    let body = ""; for await (const c of req) body += c;
    const { key, report = {} } = JSON.parse(body || "{}");
    if (!key) return res.status(400).json({ error:"Missing key" });

    const reportKey = `${baseKey(key)}.report.json`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: reportKey,
      Body: JSON.stringify(report,null,2),
      ContentType: "application/json"
    }));
    res.status(200).json({ ok:true, reportKey });
  } catch (e) {
    res.status(500).json({ error: String(e.message||e) });
  }
}
