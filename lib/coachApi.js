// lib/coachApi.js
const API_BASE =
  typeof process !== "undefined" &&
  process.env &&
  process.env.NEXT_PUBLIC_API_BASE
    ? process.env.NEXT_PUBLIC_API_BASE.replace(/\/+$/, "")
    : "";

export async function generateCoachingCard({ level, miss, goal }) {
  if (!API_BASE) {
    return {
      ok: false,
      summary:
        "Fallback: set NEXT_PUBLIC_API_BASE in .env.local.\n\n" +
        "PRIORITY FIX: Post into your lead leg earlier so you don’t flip the face.\n" +
        "DRILL: Slow to P6, freeze, then turn without throwing the face.\n",
      meta: { level, miss, goal },
      warning: "no-api-base",
    };
  }

  const resp = await fetch(`${API_BASE}/generate-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level, miss, goal }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!data || data.ok !== true) {
    return {
      ok: false,
      summary:
        "API fallback.\n\nPRIORITY FIX: Post into your lead leg earlier so you don’t flip the face.\n" +
        "DRILL: Slow to P6, freeze, then turn without throwing the face.\n",
      meta: { level, miss, goal },
      warning: "api-fallback",
    };
  }
  return data;
}

