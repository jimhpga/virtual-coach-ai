// api/upload-url.js (Edge)
export const config = { runtime: 'edge' };
import { generateUploadURL } from '@vercel/blob';

const j = (o, s=200) =>
  new Response(JSON.stringify(o), { status:s, headers:{'content-type':'application/json'} });

export default async function handler(req) {
  if (req.method !== 'POST') return j({ ok:false, error:'Method not allowed' }, 405);

  try {
    const { filename } = await req.json();
    const safe = (filename || `swing-${Date.now()}.mp4`).replace(/[^a-zA-Z0-9._-]+/g,'_');

    const { url } = await generateUploadURL({
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'video/*'
    });

    return j({ ok:true, uploadUrl: url, suggestedName: `swings/${safe}` });
  } catch (e) {
    return j({ ok:false, error: String(e?.message || e) }, 500);
  }
}
