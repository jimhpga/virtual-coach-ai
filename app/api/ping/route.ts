export const runtime = "nodejs";

export async function GET() {
  return Response.json({ ok: true, ts: new Date().toISOString() });
}

export async function POST() {
  return Response.json({ ok: true, ts: new Date().toISOString() });
}
