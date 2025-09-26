// Poll if /reports/<id>.json exists; if yes, return done + URL
export default async function handler(req, res) {
  const id = (req.query?.id || "").toString();
  if (!id) return res.status(400).json({ error: "missing id" });

  const host = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
  const url = `${host}/reports/${id}.json`;
  const head = await fetch(url, { method: "HEAD" }).catch(() => null);

  if (head && head.ok) {
    return res.status(200).json({ state: "done", reportUrl: `/reports/${id}.json` });
  }
  return res.status(200).json({ state: "processing" });
}
