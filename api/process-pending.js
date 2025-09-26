// api/process-pending.js
import { kv } from '@vercel/kv';
import { put } from '@vercel/blob';
import fs from 'node:fs';
import path from 'node:path';

const REPORT_TEMPLATE_PATH = path.join(process.cwd(), 'docs', 'report.json');

async function analyzeVideo({ blobUrl, jobId }) {
  // MVP: create a report object by loading your template and stamping a few fields
  const fallback = {
    meta: { title: 'Swing Report — P1–P9', date: new Date().toISOString().slice(0,10), mode: 'Full Swing' },
    swings: 1,
    // include minimal keys your report.html expects
  };

  let template;
  try {
    const raw = fs.readFileSync(REPORT_TEMPLATE_PATH, 'utf8');
    template = JSON.parse(raw);
  } catch {
    template = fallback;
  }

  // Stamp useful info for demonstration (shows this is a new/live report)
  template.meta = template.meta || {};
  template.meta.date = new Date().toISOString().slice(0, 10);
  template.meta.source = 'Live Upload';
  template.meta.jobId = jobId;
  template.meta.video = blobUrl;

  return template;
}

export default async function handler(req, res) {
  // Process up to N queued jobs per run
  const batchSize = 3;
  const ids = [];

  // pull a few job IDs from the set
  for (let i = 0; i < batchSize; i++) {
    const id = await kv.spop('jobs:queued'); // returns one id or null
    if (!id) break;
    ids.push(id);
  }

  for (const jobId of ids) {
    const key = `job:${jobId}`;
    const job = await kv.hgetall(key);
    if (!job) continue;

    await kv.hset(key, { status: 'processing', updatedAt: Date.now() });

    try {
      const report = await analyzeVideo({ blobUrl: job.blobUrl, jobId });

      // Write public JSON to Blob
      const fileName = `reports/${jobId}.json`;
      const { url: reportUrl } = await put(fileName, JSON.stringify(report, null, 2), {
        access: 'public',
        contentType: 'application/json'
      });

      await kv.hset(key, {
        status: 'complete',
        reportUrl,
        updatedAt: Date.now()
      });
    } catch (err) {
      await kv.hset(key, {
        status: 'error',
        error: (err && err.message) || 'unknown',
        updatedAt: Date.now()
      });
    }
  }

  res.status(200).json({ processed: ids.length, jobIds: ids });
}
