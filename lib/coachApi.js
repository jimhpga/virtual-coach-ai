const API_BASE =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.NEXT_PUBLIC_API_BASE
      ? process.env.NEXT_PUBLIC_API_BASE.replace(/\/+$/, "")
      : "");

export async function generateCoachingCard({ level, miss, goal }) {
  if (!API_BASE) {
    return {
      ok: false,
      summary:
        "Fallback card:\n\nPRIORITY FIX: Post into lead leg earlier so you don’t have to flip the face.\nDRILL: Slow to P6, freeze, then rotate through.",
      meta: { level, miss, goal },
      warning: "NEXT_PUBLIC_API_BASE not set",
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
        "Couldn’t reach the API. Here’s a baseline:\n\nPRIORITY FIX: Quiet hands at P6 and let rotation square the face.\nDRILL: Start-line gates 6–10 ft.",
      meta: { level, miss, goal },
      warning: "api-fallback",
    };
  }
  return data;
}
