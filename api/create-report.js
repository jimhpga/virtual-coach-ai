// api/create-report.js  (Edge)
export const config = { runtime: 'edge' };
import { put } from '@vercel/blob';

const json = (obj, status=200) =>
  new Response(JSON.stringify(obj), { status, headers:{'content-type':'application/json'} });

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok:false, error:'Method not allowed' }, 405);

  try {
    const { filename, videoUrl, videoPath } = await req.json();

    const jobId =
      (globalThis.crypto?.randomUUID && crypto.randomUUID()) || `job_${Date.now()}`;
    const reportKey = `reports/${jobId}.json`;

    // try to clone your sample report as template
    const host = req.headers.get('host');
    const proto = host?.startsWith('localhost') ? 'http' : 'https';
    let template = null;
    try {
      const r = await fetch(`${proto}://${host}/docs/report.json`, { cache:'no-store' });
      if (r.ok) template = await r.json();
    } catch (_) {}

    const report = template ?? { meta:{ title:'Swing Report', createdAt:new Date().toISOString() }, checkpoints:[], notes:[] };
    report.jobId = jobId;
    report.video = { url: videoUrl, path: videoPath, filename };
    report.status = 'generated';
    report.generatedAt = new Date().toISOString();

    const saved = await put(reportKey, JSON.stringify(report, null, 2), {
      access: 'public',
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return json({ ok:true, reportUrl: `/docs/report.html?report=${saved.pathname}` });
  } catch (e) {
    return json({ ok:false, error: String(e?.message || e) }, 500);
  }
}
