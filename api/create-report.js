// api/create-report.js (Edge)
export const config = { runtime: 'edge' };
import { put } from '@vercel/blob';

const j = (o, s=200) =>
  new Response(JSON.stringify(o), { status:s, headers:{'content-type':'application/json'} });

export default async function handler(req) {
  if (req.method !== 'POST') return j({ ok:false, error:'Method not allowed' }, 405);

  try {
    const { filename, videoUrl, videoPath } = await req.json();

    const jobId = (globalThis.crypto?.randomUUID && crypto.randomUUID()) || `job_${Date.now()}`;
    const reportKey = `reports/${jobId}.json`;

    // Try to copy your sample report as a template
    const host = req.headers.get('host');
    const proto = host?.startsWith('localhost') ? 'http' : 'https';
    let template = null;
    try {
      const r = await fetch(`${proto}://${host}/docs/report.json`, { cache:'no-store' });
      if (r.ok) template = await r.json();
    } catch {}

    const report = template ?? { meta:{ title:'Swing Report' }, checkpoints:[], notes:[] };
    report.jobId = jobId;
    report.video = { url: videoUrl, path: videoPath, filename };
    report.status = 'generated';
    report.generatedAt = new Date().toISOString();

    const saved = await put(reportKey, JSON.stringify(report, null, 2), {
      access: 'public',
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return j({ ok:true, reportUrl: `/docs/report.html?report=${saved.pathname}` });
  } catch (e) {
    return j({ ok:false, error: String(e?.message || e) }, 500);
  }
}
