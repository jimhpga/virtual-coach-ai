// api/process-upload.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  try {
    const { key, bucket, size, contentType } = await req.json?.() || req.body || {};
    if (!key || !bucket) return res.status(400).json({ ok:false, error:'missing_params' });
    console.log('enqueue_process', { key, bucket, size, contentType, t: Date.now() });
    // TODO: enqueue to your worker/Lambda/StepFn
    return res.status(202).json({ ok:true, accepted:true });
  } catch (e) {
    console.error('process_upload_error', { name: e?.name, message: e?.message });
    return res.status(500).json({ ok:false, error:'process_failed' });
  }
}
