// /api/make-report.js
// Node (Next.js / Vercel) API route

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

export const runtime = 'nodejs';        // ensure Node runtime (not Edge)
export const dynamic = 'force-dynamic'; // don’t cache at the platform edge

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION;
const PUBLIC_BASE = (process.env.S3_PUBLIC_BASE || '').replace(/\/+$/, ''); // optional CDN/domain
const VIEWER_ORIGIN = (process.env.REPORT_VIEWER_ORIGIN || '').replace(/\/+$/, ''); // optional site origin

export default async function handler(req, res) {
  // --- CORS (safe to expose this endpoint to your site) ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (!BUCKET || !REGION) {
      return res.status(500).json({ ok: false, error: 'Missing env S3_BUCKET / AWS_REGION' });
    }
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Use GET or POST' });
    }

    // --- read params from query or body ---
    const url = new URL(req.url || '/', 'http://local');
    let key = url.searchParams.get('key');
    let jobId = url.searchParams.get('jobId');

    if (!key && req.body && typeof req.body === 'object') {
      key = req.body.key ?? key;
      jobId = req.body.jobId ?? jobId;
    }
    if (!jobId && key) jobId = keyToJobId(key);
    if (!jobId) {
      return res.status(400).json({ ok: false, error: 'Provide ?key=uploads/… or ?jobId=… (or JSON body)' });
    }

    const s3 = new S3Client({ region: REGION });

    const statusKey = `status/${jobId}.json`;
    const reportKey = `reports/${jobId}.json`;

    // --- get optional status file ---
    let status = {};
    if (await exists(s3, statusKey)) {
      status = await getJSON(s3, statusKey);
    }

    // --- build & upload report ---
    const report = buildSampleReport({ status, jobId });
    const body = JSON.stringify(report);

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: reportKey,
      Body: body,
      ContentType: 'application/json',
      CacheControl: 'no-store, max-age=0, must-revalidate',
    }));

    // --- compute public URL for the JSON (S3 or CDN) ---
    const publicUrl = absoluteJsonUrl({ bucket: BUCKET, region: REGION, key: reportKey, base: PUBLIC_BASE });

    // --- build a ready-to-open viewer URL ---
    // If REPORT_VIEWER_ORIGIN is set, return an absolute URL, otherwise relative path
    const viewerPath = `/report.html?report=${encodeURIComponent(publicUrl)}`;
    const viewerUrl = VIEWER_ORIGIN ? `${VIEWER_ORIGIN}${viewerPath}` : viewerPath;

    res.status(200).json({
      ok: true,
      bucket: BUCKET,
      region: REGION,
      jobId,
      reportKey,
      publicUrl,
      viewerUrl,
      wrote_bytes: Buffer.byteLength(body, 'utf8'),
      preview: report,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// --- helpers ---

function keyToJobId(k) {
  return String(k || '').replace(/^uploads\//, '').replace(/\.[^.]+$/, '');
}

async function exists(s3, Key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key }));
    return true;
  } catch {
    return false;
  }
}

async function getJSON(s3, Key) {
  const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key }));
  if (typeof r.Body?.transformToString === 'function') {
    return JSON.parse(await r.Body.transformToString());
  }
  const chunks = [];
  for await (const ch of r.Body) chunks.push(ch);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function absoluteJsonUrl({ bucket, region, key, base }) {
  if (base) return `${base}/${key}`;
  // Virtual-hosted–style S3 URL:
  // us-east-1 uses s3.amazonaws.com, others use s3.<region>.amazonaws.com
  const host = region === 'us-east-1'
    ? `${bucket}.s3.amazonaws.com`
    : `${bucket}.s3.${region}.amazonaws.com`;
  return `https://${host}/${key}`;
}

// --- sample report (same shape you already used) ---
function buildSampleReport({ status = {}, jobId }) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    created: today,
    jobId,
    discipline: 'full_swing',
    swings: 1,
    video_key: `uploads/${jobId}.mp4`,
    phases: [
      { id: 'P1', name: 'Setup', grade: 'ok', short: 'Neutral grip & balanced posture',
        long: 'Athletic stance, slight forward shaft lean. Keep chin up to free rotation.' },
      { id: 'P2', name: 'Takeaway', grade: 'ok', short: 'Club head just outside hands',
        long: 'Hands connected, square face to arc. Avoid early forearm roll.' },
      { id: 'P4', name: 'Top', grade: 'ok', short: 'Lead wrist flat, trail arm ~90°',
        long: 'Complete shoulder turn without overswing. Maintain trail knee flex.' },
      { id: 'P6', name: 'Shaft Parallel Down', grade: 'ok', short: 'Club on plane, hands in front of thigh',
        long: 'Trail elbow in front of hip; shallow a touch to avoid steep approach.' },
      { id: 'P7', name: 'Impact', grade: 'good', short: 'Forward shaft lean; weight left',
        long: 'Hips open, chest slightly open, handle ahead. Ball-first contact.' },
    ],
    position_metrics: [
      { label: 'P2 Club-Head In/Out', value: 64 },
      { label: 'P4 Lead Wrist Condition', value: 71 },
      { label: 'P6 Shaft Pitch', value: 69 },
      { label: 'P7 Handle Ahead', value: 82 },
    ],
    swing_metrics: [
      { label: 'Tempo Ratio', value: 76 },
      { label: 'Club Path Variance', value: 66 },
      { label: 'Release Timing', value: 68 },
    ],
    power: { score: 79, tempo: '3:1', release_timing: 68, tour: 85 },
    cohort: { hand: 'right', eye: 'right', gender: 'male', height: 72, build: 'athletic' },
    source_status: {
      size: status.size ?? null,
      type: status.type ?? null,
      etag: status.etag ?? null,
      t: status.t ?? null,
    },
  };
}
