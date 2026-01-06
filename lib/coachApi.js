export const API_BASE =
  (typeof window !== "undefined" && window.__API_BASE__) ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://api.virtualcoachai.net";

export async function createDirectUpload() {
  const res = await fetch(`${API_BASE}/api/mux-direct-upload`, { method: "POST" });
  if (!res.ok) throw new Error(`mux-direct-upload ${res.status}`);
  return res.json();
}

export async function makeReport(payload) {
  const res = await fetch(`${API_BASE}/api/make-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`make-report ${res.status}`);
  return res.json();
}
