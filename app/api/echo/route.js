// app/api/echo/route.js
export async function GET(req) {
  const headers = Object.fromEntries(req.headers);
  const url     = new URL(req.url);
  return Response.json({ ok:true, router:"app", method:"GET", headers, query:Object.fromEntries(url.searchParams.entries()), body:null }, { status:200 });
}
export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const headers = Object.fromEntries(req.headers);
  const url     = new URL(req.url);
  return Response.json({ ok:true, router:"app", method:"POST", headers, query:Object.fromEntries(url.searchParams.entries()), body }, { status:200 });
}
