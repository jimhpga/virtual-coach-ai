const crypto = require("node:crypto");

/**
 * Cron/Manual kick to process pending jobs.
 * Auth: pass ?token=CRON_TOKEN or header x-cron-token: CRON_TOKEN
 * Returns: { ok, runId, processed, pending }
 */
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const token = (req.query && req.query.token) || req.headers["x-cron-token"];
  const expected = process.env.CRON_TOKEN;

  if (!expected || token !== expected) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  // TODO: pull real pending jobs and process them.
  // Stubbed behavior (keeps the endpoint working like your last test):
  const runId = crypto.randomBytes(16).toString("hex");

  return res.status(200).json({
    ok: true,
    runId,         // e.g. "9f43f5ca…"
    processed: 0,  // increment when real jobs are processed
    pending: 0     // report queue size if available
  });
};
