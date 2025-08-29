// /api/make-report.js
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION;

// small helpers
const respond = (status, obj) =>
  new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const jobIdFromKey = (key) =>
  String(key || "").replace(/^uploads\//, "").replace(/\.[^.]+$/, "");

async function head(s3, Key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key }));
    return true;
  } catch {
    return false;
  }
}

async function getJSON(s3, Key) {
  const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key }));
  const txt = await r.Body.transformToString();
  return JSON.parse(txt);
}

// sample report builder (swap to real analyzer later)
function buildSampleReport({ status = {}, jobId }) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    created: today,
    jobId,
    discipline: "full_swing",
    swings: 1,
    video_key: `uploads/${jobId}.mp4`,
    phases: [
      { id: "P1", name: "Setup", grade: "ok", short: "Neutral grip & balanced posture",
        long: "Athletic stance, slight forward shaft lean. Keep chin up to free rotation." },
      { id: "P2", name: "Takeaway", grade: "ok", short: "Club head just outside hands",
        long: "Hands connected, square face to arc. Avoid early forearm roll." },
      { id: "P4", name: "Top", grade: "ok", short: "Lead wrist flat, trail arm ~90°",
        long: "Complete shoulder turn without overswing. Maintain trail knee flex." },
      { id: "P6", name: "Shaft Parallel Down", grade: "ok", short: "Club on plane, hands in front of thigh",
        long: "Trail elbow in front of hip; shallow a touch to avoid steep approach." },
      { id: "P7", name: "Impact", grade: "good", short: "Forward shaft lean; weight left",
        long: "Hips open, chest slightly open, handle ahead. Ball-first contact." }
    ],
    position_metrics: [
      { label: "P2 Club-Head In/Out", value: 64 },
      { label: "P4 Lead Wrist Condition", value: 71 },
      { label: "P6 Shaft Pitch", value: 69 },
      { label: "P7 Handle Ahead", value: 82 }
    ],
    swing_metrics: [
      { label: "Tempo Ratio", value: 76 },
      { label: "Club Path Variance", value: 66 },
      { label: "Release Timing", value: 68 }
    ],
    power: { score: 79, tempo: "3:1", release_timing: 68, tour: 85 },
    cohort: { hand: "right", eye: "right", gender: "male", height: 72, build: "athletic" },
    source_status: {
      size: status.size ?? null, type: status.type ?? null,
      etag: status.etag ?? null, t: status.t ?? null
    }
  };
}

export default async function handler(request) {
  try {
    if (!BUCKET || !REGION) {
      return respond(500, { ok: false, error: "Missing env: S3_BUCKET and/or AWS_REGION" });
    }
    const url = new URL(request.url);
    let key = url.searchParams.get("key");
    let jobId = url.searchParams.get("jobId");
    if (!jobId && key) jobId = jobIdFromKey(key);
    if (!jobId) return respond(400, { ok: false, error: "Provide ?key=uploads/… or ?jobId=…" });

    const s3 = new S3Client({ region: REGION });
    const statusKey = `status/${jobId}.json`;
    const reportKey = `reports/${jobId}.json`;

    // read status if present
    let status = {};
    if (await head(s3, statusKey)) {
      try { status = await getJSON(s3, statusKey); } catch {}
    }

    // write report
    const report = buildSampleReport({ status, jobId });
    const body = JSON.stringify(report);
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: reportKey, Body: body, ContentType: "application/json"
    }));

    return respond(200, { ok: true, bucket: BUCKET, jobId, reportKey, wrote_bytes: body.length, preview: report });
  } catch (e) {
    return respond(500, { ok: false, error: e?.message || String(e) });
  }
}
