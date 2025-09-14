// api/upload-signed.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

module.exports = async (req, res) => {
  if (req.url.includes('probe=1')) {
    res.setHeader('X-Upload-Rev','v4'); // bump rev so we can verify in PS
    return res.status(200).send('ok');
  }

  const url = new URL(req.url, `https://${req.headers.host}`);
  const keyHdr = (req.headers['x-api-key'] || url.searchParams.get('key') || '').toString();
  if (!keyHdr) return res.status(400).json({ ok:false, error:'Missing API key' });

  const chunks = []; for await (const ch of req) chunks.push(ch);
  let body; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { return res.status(400).json({ ok:false, error:'Invalid JSON' }); }

  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION;
  const uploadPrefix = process.env.S3_UPLOAD_PREFIX || 'uploads/';
  const clientId = String(body?.metadata?.clientId || 'anon');
  const note = String(body?.metadata?.note || '');
  const contentType = String(body?.contentType || 'application/octet-stream');
  const safeName = String(body?.filename || 'upload.bin').replace(/[^\w.\- ]+/g,'_');
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  const key = `${uploadPrefix}${clientId}/${stamp}-${safeName}`;

  // 🔑 disable request checksums so the URL doesn't include x-amz-sdk-checksum-* noise
  const s3 = new S3Client({ region, requestChecksumCalculation: 'never' });

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    Metadata: { clientid: clientId, note }
  });

  const urlPut = await getSignedUrl(s3, cmd, { expiresIn: 600 });
  res.setHeader('X-Upload-Rev','v4');
  return res.status(200).json({ ok:true, key, url: urlPut });
};

module.exports.config = { maxDuration: 10 };
