// /api/analyze.js
import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION;

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function jobIdFromKey(key) {
  const base = String(key).replace(/^uploads\//, "");
  return base.replace(/\.[^.]+$/, "");
}

async function objectExists(s3, key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function getJSON(s3, key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const txt = await res.Body.transformToString();
  return JSON.parse(txt);
}

export default async function handler(request) {
  try {
    if (request.method !== "GET") {
      return json(405, { ok: false, error: "Method Not Allowed" });
    }
    if (!BUCKET || !REGION) {
      return json(500, { ok: false, error: "Missing S3 env (S3_BUCKET, AWS_REGION)" });
    }

    const url = new URL(request.url);
    const keyParam = url.searchParams.get("key");
    let jobId = url.searchParams.get("jobId");

    if (!jobId && keyParam) jobId = jobIdFromKey(keyParam);
    if (!jobId) return json(400, { ok: false, error: "Missing jobId or key" });

    const s3 = new S3Client({ region: REGION });
    const statusKey = `status/${jobId}.json`;
    const reportKey = `reports/${jobId}.json`;

    // default shape
    const body = {
      ok: true,
      bucket: BUCKET,
      key: statusKey,
      jobId,
      status: "pending"
    };

    // read status if it exists
    if (await objectExists(s3, statusKey)) {
      try {
        const s = await getJSON(s3, statusKey);
        if (s?.status) body.status = s.status;
        if ("size" in s) body.size = s.size;
        if ("type" in s) body.type = s.type;
        if ("etag" in s) body.etag = s.etag;
        if ("t" in s) body.t = s.t;
      } catch {
        // ignore corrupt status; leave pending
      }
    }

    // if a per-upload report exists, return pointer + embed it for instant render
    if (await objectExists(s3, reportKey)) {
      body.reportKey = reportKey;
      try {
        body.report = await getJSON(s3, reportKey);
        body.status = "ready";
      } catch {
        // keep pointer even if embed fails
      }
    }

    return json(200, body);
  } catch (e) {
    return json(500, { ok: false, error: e?.message || String(e) });
  }
}
