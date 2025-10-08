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

const baseKey = k => String(k||"").replace(/\.[a-z0-9]+$/i,"");

export default async function handler(req, res) {
  const key = String(req.query.key || "").trim();
  if (!key) return res.status(400).json({ error:"Missing key" });
  if (!BUCKET) return res.status(500).json({ error:"S3 bucket not configured" });

  try {
    const reportKey = `${baseKey(key)}.report.json`;
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: reportKey }))
      .catch(()=>{ throw { code:"NO_REPORT" }; });

    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: reportKey }));
    const txt = await obj.Body.transformToString();
    let report; try { report = JSON.parse(txt); } catch { report = { raw: txt }; }
    const status = typeof report.status === "string" ? report.status : "ready";
    if (status !== "ready") return res.status(200).json({ status });
    res.status(200).json({ status:"ready", report });
  } catch (e) {
    if (e && e.code === "NO_REPORT") return res.status(200).json({ status:"pending" });
    res.status(500).json({ error:String(e.message||e) });
  }
}
