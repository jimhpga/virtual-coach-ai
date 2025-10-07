import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const { S3_BUCKET, AWS_REGION } = process.env;
const s3 = new S3Client({ region: AWS_REGION });

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow","POST"); return res.status(405).json({error:"Method Not Allowed"}); }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body||"{}") : (req.body||{});
    const { filename, type="video/mp4" } = body;
    if (!filename) return res.status(400).json({ error: "filename required" });

    const now = new Date();
    const key = `uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth()+1).padStart(2,"0")}/${String(now.getUTCDate()).padStart(2,"0")}/${Date.now()}-${filename.replace(/\s+/g,"_")}`;

    const { url, fields } = await createPresignedPost(s3, {
      Bucket: S3_BUCKET,
      Key: key,
      Conditions: [
        ["content-length-range", 0, 1024*1024*500],
        ["starts-with", "$Content-Type", ""]
      ],
      Fields: { "Content-Type": type },
      Expires: 60
    });
    res.status(200).json({ url, fields, key });
  } catch (e) { res.status(500).json({ error: "presign error", detail: String(e) }); }
}
