// /api/analyze.js
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION;

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'GET only' });
    if (!BUCKET || !REGION) return res.status(500).json({ ok:false, error:'Missing env S3_BUCKET/AWS_REGION' });

    const url = new URL(req.url, 'http://x');
    let key = url.searchParams.get('key');
    let jobId = url.searchParams.get('jobId');
    const autowrite = url.searchParams.get('autowrite') !== '0'; // default true

    if (!jobId && key) jobId = keyToJobId(key);
    if (!jobId) return res.status(400).json({ ok:false, error:'Provide ?key=uploads/… or ?jobId=…' });

    const s3 = new S3Client({ region: REGION });
    const statusKey = `status/${jobId}.json`;
    const reportKey = `reports/${jobId}.json`;

    // 1) check status
    const hasStatus = await head(s3, statusKey);
    if (!hasStatus) {
      return res.status(200).json({ ok:true, bucket: BUCKET, key: statusKey, jobId, status:'pending' });
    }
    const status = await getJSON(s3, statusKey);
    const out = { ok:true, bucket: BUCKET, key: statusKey, jobId, ...status };

    // 2) if ready, include/generate report
    if (String(status.status).toLowerCase() === 'ready') {
      if (await head(s3, reportKey)) {
        out.report_key = reportKey;
        out.report = await getJSON(s3, reportKey);
      } else if (autowrite) {
        const report = buildSampleReport({ status, jobId });
        const body = JSON.stringify(report);
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET, Key: reportKey, Body: body, ContentType: 'application/json'
        }));
        out.report_key = reportKey;
        out.report = report;
      }
    }

    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ ok:false, error: e?.message || String(e) });
  }
}

function keyToJobId(k) {
  if (!k) return null;
  return String(k).replace(/^uploads\//, '').replace(/\.[^.]+$/, '');
}
async function head(s3, Key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key })); return true; }
  catch { return false; }
}
async function getJSON(s3, Key) {
  const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key }));
  if (typeof r.Body?.transformToString === 'function') {
    return JSON.parse(await r.Body.transformToString());
  }
  const chunks = [];
  for await (const chunk of r.Body) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

// sample report (replace with real analyzer when ready)
function buildSampleReport({ status = {}, jobId }) {
  const today = new Date().toISOString().slice(0,10);
  return {
    created: today,
    jobId,
    discipline: 'full_swing',
    swings: 1,
    video_key: `uploads/${jobId}.mp4`,
    phases: [
      { id:'P1', name:'Setup', grade:'ok', short:'Neutral grip & balanced posture',
        long:'Athletic stance, slight forward shaft lean. Keep chin up to free rotation.' },
      { id:'P2', name:'Takeaway', grade:'ok', short:'Club head just outside hands',
        long:'Hands connected, square face to arc. Avoid early forearm roll.' },
      { id:'P4', name:'Top', grade:'ok', short:'Lead wrist flat, trail arm ~90°',
        long:'Complete shoulder turn without overswing. Maintain trail knee flex.' },
      { id:'P6', name:'Shaft Parallel Down', grade:'ok', short:'Club on plane, hands in front of thigh',
        long:'Trail elbow in front of hip; shallow a touch to avoid steep approach.' },
      { id:'P7', name:'Impact', grade:'good', short:'Forward shaft lean; weight left',
        long:'Hips open, chest slightly open, handle ahead. Ball-first contact.' },
    ],
    position_metrics: [
      { label:'P2 Club-Head In/Out', value:64 },
      { label:'P4 Lead Wrist Condition', value:71 },
      { label:'P6 Shaft Pitch', value:69 },
      { label:'P7 Handle Ahead', value:82 },
    ],
    swing_metrics: [
      { label:'Tempo Ratio', value:76 },
      { label:'Club Path Variance', value:66 },
      { label:'Release Timing', value:68 },
    ],
    power: { score:79, tempo:'3:1', release_timing:68, tour:85 },
    cohort: { hand:'right', eye:'right', gender:'male', height:72, build:'athletic' },
    source_status: {
      size: status.size ?? null, type: status.type ?? null,
      etag: status.etag ?? null, t: status.t ?? null
    }
  };
}
