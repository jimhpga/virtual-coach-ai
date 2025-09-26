// api/process-pending.js
// Runs via Vercel Cron (GET), or manually by visiting /api/process-pending?token=YOUR_TOKEN

export const config = {
  runtime: "edge" // fast cold start; okay for light work
};

function ok(json, status = 200) {
  return new Response(JSON.stringify(json), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const isCron = req.headers.get("x-vercel-cron") === "1";
    const token = url.searchParams.get("token");
    const required = process.env.CRON_TOKEN; // set in Vercel → Settings → Environment Variables

    // Optional gate: allow Vercel Cron OR manual calls with a token
    if (!isCron && required && token !== required) {
      return ok({ ok: false, error: "unauthorized" }, 401);
    }

    // TODO: replace these stubs with real work:
    // - find uploads in "queued" (e.g., from KV/DB/object store)
    // - dispatch processing / advance job state
    // - clean temporary files
    // - mark stale jobs as failed with a friendly message

    const now = new Date().toISOString();
    console.log("[cron] tick", now);

    // Example "no-op" work:
    const summary = {
      tick: now,
      jobsFound: 0,
      jobsAdvanced: 0,
      cleaned: true
    };

    return ok({ ok: true, ...summary });
  } catch (err) {
    console.error("process-pending error", err);
    return ok({ ok: false, error: String(err) }, 500);
  }
}
