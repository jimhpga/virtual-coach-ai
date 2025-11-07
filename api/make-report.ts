export const runtime = "edge";
const API = "https://api.virtualcoachai.net";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
  });
}

export async function POST(req) {
  const json = await req.text(); // pass-through raw body
  const upstream = await fetch(`${API}/api/make-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: json,
  });
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
