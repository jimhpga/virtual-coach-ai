// /api/job-status.js
export default async function handler(req, res) {
  // Stub: immediately "done" with your sample report stored in /docs
  // On Vercel, due to rewrites, this path resolves correctly.
  return res.status(200).json({
    state: "done",
    reportUrl: "/docs/report.json"
  });
}
