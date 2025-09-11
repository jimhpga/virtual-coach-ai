// app/api/ping/route.js
export function GET() { return Response.json({ ok:true, t: Date.now(), router:"app" }, { status: 200 }); }
