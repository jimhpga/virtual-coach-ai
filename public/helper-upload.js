// helpers-upload.js
// Small utilities used by upload.html and any page that needs /api/report + /api/analyze

// Turn "uploads/1234-name.mov" into a stable jobId "1234-name"
export function jobIdFromKey(key) {
  const base = String(key || "").replace(/^uploads\//, "");
  return base.replace(/\.[^.]+$/, "");
}

// POST /api/report to write status (default: "ready") for a given key or jobId
export async function reportReady({ key, jobId, status = "ready", data = {} }) {
  if (!jobId && key) jobId = jobIdFromKey(key);
  if (!jobId) throw new Error("reportReady: missing jobId or key");

  const r = await fetch("/api/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, status, data, key })
  });

  // Try to parse JSON even on non-200 to surface server errors
  let j = {};
  try { j = await r.json(); } catch { /* ignore */ }

  if (!r.ok || j.ok === false) {
    throw new Error(`reportReady failed: HTTP ${r.status} ${j.error || ""}`);
  }
  return j; // { ok:true, bucket, key, wrote:{...} }
}

// Poll /api/analyze until it returns {status:"ready"} or a non-pending status.
// Accepts either key or jobId; does simple backoff.
export async function pollAnalyze({
  key,
  jobId,
  intervalMs = 1500,   // initial delay
  maxAttempts = 40,    // ~1 minute total with backoff
  onTick = () => {}    // callback each poll: ({ attempt, delay, response })
}) {
  if (!jobId && key) jobId = jobIdFromKey(key);
  if (!jobId && !key) throw new Error("pollAnalyze: missing jobId or key");

  let attempt = 0;
  let delay = intervalMs;

  while (attempt < maxAttempts) {
    const qs = key ? `key=${encodeURIComponent(key)}` : `jobId=${encodeURIComponent(jobId)}`;
    const res = await fetch(`/api/analyze?${qs}`);
    const text = await res.text();

    let payload;
    try { payload = JSON.parse(text); }
    catch { payload = { status: "error", error: "invalid JSON", raw: text }; }

    onTick({ attempt, delay, response: payload });

    if (payload.status === "ready") return payload;
    if (payload.status && payload.status !== "pending") {
      const err = new Error(payload.error || payload.status);
      err.details = payload;
      throw err;
    }

    // pending Ã¢â€ â€™ wait and backoff
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(Math.round(delay * 1.5), 8000);
    attempt++;
  }

  throw new Error("pollAnalyze: timed out waiting for ready");
}



