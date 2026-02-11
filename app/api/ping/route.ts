export const runtime = "nodejs";

export async function GET() {
  return new Response(JSON.stringify({ ok:true, route:"/api/ping", ts: Date.now() }), {
    status: 200,
    headers: { "Content-Type":"application/json" }
  });
}

export async function POST(req: Request) {
  let body:any = null;
  try { body = await req.json(); } catch {}
  return new Response(JSON.stringify({ ok:true, route:"/api/ping", body, ts: Date.now() }), {
    status: 200,
    headers: { "Content-Type":"application/json" }
  });
}
