// api/ping.js
export const config = { runtime: 'nodejs20.x', maxDuration: 10, regions: ['pdx1','sfo1'] };
export default async function handler(req, res) {
  res.status(200).json({ ok:true, method:req.method, t:Date.now() });
}
