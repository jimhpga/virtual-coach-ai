// /api/analyze.js
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION || "us-west-2";
const bucket = process.env.S3_UPLOAD_BUCKET;
const reportsPrefix = process.env.S3_REPORTS_PREFIX || "reports/";

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function getTextBody(resp) {
  return await resp.Body.transformToString();
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  try{
    const key = req.query.key; // e.g. uploads/UUID.mp4
    if (!key) return res.status(400).json({ error: "Missing key" });

    const reportKey = `${reportsPrefix}${key.replace(/^uploads\//,'').replace(/\.mp4$/i,'')}.json`;

    // Is there a finished report?
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: reportKey }));
      const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: reportKey }));
      const txt = await getTextBody(obj);
      const json = JSON.parse(txt);
      return res.status(200).json({ status: "ready", report: json });
    } catch (e) {
      // Not ready yet
      return res.status(200).json({ status: "pending", checkAfter: 5 });
    }
  }catch(err){
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
}
