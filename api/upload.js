// api/upload.js  — Edge function + Vercel Blob
export const config = { runtime: 'edge' };

import { put } from '@vercel/blob';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' }
  });

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!file || typeof file === 'string') {
      return json({ ok: false, error: 'No file uploaded' }, 400);
    }

    // Clean filename, and put it under a folder
    const safeName =
      (file.name || `swing-${Date.now()}.mp4`).replace(/[^a-zA-Z0-9._-]+/g, '_');
    const key = `swings/${safeName}`;

    // Upload to Vercel Blob (public readable)
    const { url, pathname } = await put(key, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    // Create a job id (real system would insert into DB here)
    const jobId =
      (globalThis.crypto?.randomUUID && crypto.randomUUID()) ||
      `job_${Date.now()}`;

    // TODO: insert a row into your database:
    //  - jobId, status='pending', videoPath=pathname, videoUrl=url, createdAt
    //  - any user info you want to associate
    //
    // Example (pseudo):
    // await db.jobs.insert({ jobId, status: 'pending', videoPath: pathname, videoUrl: url, createdAt: new Date() })

    // For now, return a predictable report URL so the UI can navigate later
    const reportJsonPath = `reports/${jobId}.json`;

    return json({
      ok: true,
      jobId,
      videoUrl: url,
      videoPath: pathname, // e.g. "swings/filename.mp4"
      reportUrl: `/docs/report.html?report=${reportJsonPath}`
    });
  } catch (err) {
    return json({ ok: false, error: String(err?.message || err) }, 500);
  }
}
