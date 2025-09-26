// Upload video → (optionally) kick off Replicate → return jobId + status URL.
// If no tokens are set, we still create a new report by cloning the sample.
export const config = { api: { bodyParser: false } };

const BLOB = "https://blob.vercel-storage.com";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // Read raw body
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);

  const jobId = Date.now().toString(36);
  const filename = `${jobId}.mp4`;

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const host = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;

  if (!blobToken) {
    // “Demo” path: immediately schedule report clone so the flow works end-to-end
    await fetch(`${host}/api/replicate-callback?id=${jobId}`, { method: "POST" });
    return res.status(200).json({ jobId, statusUrl: `/api/job-status?id=${jobId}` });
  }

  // 1) Upload video to Vercel Blob
  const up = await fetch(`${BLOB}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${blobToken}`,
      "x-vercel-filename": filename,
      "Content-Type": "application/octet-stream",
    },
    body
  });

  if (!up.ok) {
    const t = await up.text().catch(() => "");
    console.error("Blob upload failed:", t);
    return res.status(500).json({ error: "blob upload failed" });
  }

  const { url: videoUrl } = await up.json();

  // 2) If Replicate is configured, kick a prediction; else clone sample right away
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const modelVersion = process.env.REPLICATE_MODEL_VERSION; // e.g. a YOLOv8 pose version id

  if (replicateToken && modelVersion) {
    await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${replicateToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: modelVersion,
        input: { video: videoUrl },
        webhook: `${host}/api/replicate-callback?id=${jobId}`,
        webhook_events_filter: ["completed"]
      })
    });
  } else {
    await fetch(`${host}/api/replicate-callback?id=${jobId}`, { method: "POST" });
  }

  return res.status(200).json({ jobId, statusUrl: `/api/job-status?id=${jobId}` });
}
