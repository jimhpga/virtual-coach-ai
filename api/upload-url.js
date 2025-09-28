// api/upload-url.js
import { put } from '@vercel/blob';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const { filename } = await req.json();
    if (!filename) {
      return new Response(JSON.stringify({ error: 'filename required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Create a one-time PUT URL for direct upload from the browser.
    const { url: uploadUrl } = await put(filename, null, {
      access: 'private',
      contentType: 'application/octet-stream',
      addRandomSuffix: true,
    });

    return new Response(JSON.stringify({ uploadUrl }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || 'upload-url failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
