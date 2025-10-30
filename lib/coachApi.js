const API_BASE =
  typeof process !== "undefined" &&
  process.env &&
  process.env.NEXT_PUBLIC_API_BASE
    ? process.env.NEXT_PUBLIC_API_BASE.replace(/\/+$/, "")
    : "";

export async function generateCoachingCard({ level, miss, goal }) {
  if (!API_BASE) {
    throw new Error(
      "API base URL is not set. Did you create .env.local with NEXT_PUBLIC_API_BASE?"
    );
  }

  const resp = await fetch(`${API_BASE}/generate-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      level,
      miss,
      goal,
    }),
  });

  const data = await resp.json().catch(() => ({}));

  if (!data || data.ok !== true) {
    return {
      ok: false,
      summary:
        "We couldn't get a live card right now. Take this baseline:\n\n" +
        "PRIORITY FIX: Post into your lead leg earlier so you don't have to flip the face.\n" +
        "DRILL: Slow to P6, freeze, then turn through without throwing the face.\n",
      meta: {
        level,
        miss,
        goal,
      },
      warning: "fallback",
    };
  }

  return data;
}
