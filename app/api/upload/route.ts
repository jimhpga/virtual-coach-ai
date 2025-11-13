// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";

// ---- Optional S3 fallback (only used if MUX envs are missing)
async function createS3Presign(): Promise<{ url: string; id: string }> {
  const { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_REGION } = process.env;
  if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_BUCKET || !S3_REGION) {
    throw new Error("No MUX credentials and no S3 fallback configured.");
  }
  // Lazy import to keep edge-friendly
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const client = new S3Client({
    region: S3_REGION,
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });

  const id = `s3-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const key = `uploads/${id}.mp4`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: "application/octet-stream",
  });

  const url = await getSignedUrl(client, command, { expiresIn: 60 * 10 });
  return { url, id };
}

export async function POST(_req: NextRequest) {
  const { MUX_TOKEN_ID, MUX_TOKEN_SECRET } = process.env;

  // Prefer MUX if available
  if (MUX_TOKEN_ID && MUX_TOKEN_SECRET) {
    const auth = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString("base64");
    const resp = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cors_origin: "*",
        new_asset_settings: { playback_policy: ["public"] },
        // "timeout" optional
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: `MUX create upload failed: ${text}` }, { status: 500 });
    }

    const data = await resp.json();
    // Shape per MUX API
    const id = data?.data?.id;
    const url = data?.data?.url; // pre-signed PUT URL
    if (!id || !url) return NextResponse.json({ error: "Invalid MUX response" }, { status: 500 });

    return NextResponse.json({ provider: "mux", id, url });
  }

  // S3 fallback
  try {
    const { id, url } = await createS3Presign();
    return NextResponse.json({ provider: "s3", id, url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
