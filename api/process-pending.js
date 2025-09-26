// api/process-pending.js
export default async function handler(req, res) {
  try {
    const tokenParam = req.query.token || req.headers['x-cron-token'] || '';
    const envToken = process.env.CRON_TOKEN;

    // If a token is configured, require it and never echo it back
    if (envToken) {
      if (!tokenParam || tokenParam !== envToken) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
      }
    }

    // ---- Stubbed "cron" work (replace with real job advancing) ----
    const now = new Date().toISOString();
    const jobsFound = 0;
    const jobsAdvanced = 0;
    const cleaned = true;
    // ---------------------------------------------------------------

    return res.status(200).json({
      ok: true,
      tick: now,
      jobsFound,
      jobsAdvanced,
      cleaned
    });
  } catch (err) {
    console.error('[cron] error', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
