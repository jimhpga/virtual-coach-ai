// api/upload-url.js  (Edge)
export const config = { runtime: 'edge' };
import { generateUploadURL } from '@vercel/blob';

const json = (obj, status=200) =>
  new Response(JSON.stringify(obj), { status, headers:{'content-type':'application/json'} });

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok:false, error:'Method not allowed' }, 405);

  try {
    const { filename } = await req.json();
    const key = `swings/${(filename || `swing-${Date.now()}.mp4`).replace(/[^a-zA-Z0-9._-]+/g,'_')}`;

    const { url, pathname } = await generateUploadURL({
      access: 'public',
      contentType: 'video/*',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      // optional: max size (bytes), expires, etc.
    });

    return json({ ok:true, uploadUrl: url, blobPath: key, pathname });
  } catch (e) {
    return json({ ok:false, error: String(e?.message || e) }, 500);
  }
}
