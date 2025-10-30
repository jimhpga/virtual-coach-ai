const API_BASE =
  typeof process !== "undefined" &&
  process.env &&
  process.env.NEXT_PUBLIC_API_BASE
    ? process.env.NEXT_PUBLIC_API_BASE.replace(/\/+$/, "")
    : "";

// Call Render backend: /generate-report
export async function generateCoachingCard({ level, miss, goal }) {
  if (!API_BASE) {
    throw new Error("API base URL is not set. Create .env.local with NEXT_PUBLIC_API_BASE.");
  }
  const resp = await fetch(`${API_BASE}/generate-report`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ level, miss, goal }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!data || data.ok !== true) {
    return {
      ok: false,
      summary:
        "Fallback card:\n\nPRIORITY FIX: Post into your lead leg earlier so you don't have to flip the face.\n" +
        "DRILL: Slow to P6, freeze, then turn through without throwing the face.\n",
      meta: { level, miss, goal },
      warning: "fallback",
    };
  }
  return data;
}

// Optional future endpoint (only if you add /save-report on Render)
export async function saveReportToCloud(reportPayload) {
  if (!API_BASE) throw new Error("API base URL is not set.");
  const resp = await fetch(`${API_BASE}/save-report`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(reportPayload || {}),
  });
  return await resp.json().catch(() => ({}));
}
