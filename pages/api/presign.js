import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const body = await readJson(req);
    const filename = (body.filename || body.name || "video.mp4").replace(/[^\w.\-.]/g, "_");
    const contentType = body.type || "video/mp4";
    const key = `uploads/${Date.now()}-${filename}`;

    const post = await createPresignedPost(s3, {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Expires: 60, // seconds
      Conditions: [["content-length-range", 0, 500 * 1024 * 1024]], // up to 500MB
      Fields: {
        "Content-Type": contentType,
        success_action_status: "201",
      },
    });

    // Return everything the client needs to POST directly to S3
    res.status(200).json({ ...post, key });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "presign failed" });
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}
