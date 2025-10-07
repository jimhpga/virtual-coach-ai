import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const { S3_BUCKET, AWS_REGION } = process.env;
const s3 = new S3Client({ region: AWS_REGION });

export default async function handler(req, res) {
  const { key } = req.query || {};
  if (!key) return res.status(400).json({ error: "missing key" });

  try {
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
      { expiresIn: 60 } // seconds
    );
    return res.status(200).json({ url });
  } catch (e) {
    return res.status(404).json({ error: "not found", detail: String(e) });
  }
}
