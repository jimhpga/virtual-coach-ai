// /api/make-report.ts  (Vercel Edge Runtime)
export const config = { runtime: "edge", regions: ["iad1"] }; // pick your region(s)

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Expecting JSON: { filename, size, mime }
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { filename = "video.mp4", size = 0, mime = "video/mp4" } = payload || {};

  // TODO: kick off your real processing job here
  // For now return a stub report URL you can open in /report.html?report=<url>
  const id = `vc_${Date.now().toString(36)}`;
  const reportKey = `reports/${id}.json`;
  const reportUrl = `/report.html?report=/exports/${reportKey}`;

  return new Response(
    JSON.stringify({ ok: true, id, filename, size, mime, reportKey, reportUrl }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}
