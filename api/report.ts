// api/report.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export const config = { runtime: 'nodejs' };

const REGION = process.env.AWS_REGION!;
const BUCKET = process.env.S3_BUCKET!;
const s3 = new S3Client({ region: REGION });

function allowCORS(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', 'https://virtualcoachai.net');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}
const sha = (s: string) => crypto.createHash('sha1').update(s).digest('hex');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (allowCORS(req, res)) return;

  if (req.method === 'POST') {
    try {
      const qsKey = (req.query.key as string) || '';
      const bodyKey = (req.body?.key as string) || '';
      const key = (bodyKey || qsKey || '').toString();
      if (!key) return res.status(400).json({ ok:false, error:'MISSING_KEY' });

      const id = sha(key).slice(0,16);
      const reportKey = `reports/${id}.json`;
      const report = demoReport(key); // instant READY for demo

      await s3.send(new PutObjectCommand({
        Bucket: BUCKET, Key: reportKey,
        Body: JSON.stringify(report), ContentType: 'application/json'
      }));

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok:true, status:report.status, reportKey, key });
    } catch (e:any) {
      return res.status(500).json({ ok:false, error:e.message ?? 'REPORT_POST_ERROR' });
    }
  }

  if (req.method === 'GET') {
    try {
      const demo = req.query.demo as string | undefined;
      const key  = (req.query.key as string) || '';
      if (demo) return res.status(200).json(demoReport(key || 'uploads/demo.mov'));
      if (!key)   return res.status(400).json({ ok:false, error:'MISSING_KEY' });

      const id = sha(key).slice(0,16);
      const reportKey = `reports/${id}.json`;

      try {
        const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: reportKey }));
        const text = await obj.Body!.transformToString();
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(JSON.parse(text));
      } catch {
        return res.status(202).json({ ok:false, status:'queued', error:'NOT_READY' });
      }
    } catch (e:any) {
      return res.status(500).json({ ok:false, error:e.message ?? 'REPORT_GET_ERROR' });
    }
  }

  return res.status(405).send('Method Not Allowed');
}

function demoReport(sourceKey: string) {
  return {
    ok: true, status: 'ready', sourceKey,
    mode: 'full-swing', displayMode:'exoskeleton', ui:{ preset:'standard' },
    swingScore: 85,
    p_checkpoints: [
      { p:1, label:'Setup', grade:'GOOD', notes:'55/45; hinge ~25°; neutral' },
      { p:6, label:'Shaft parallel (DS)', grade:'WARN', notes:'Need more side bend; add vertical force' },
      { p:7, label:'Impact', grade:'GOOD', notes:'Forward shaft; ~85% lead side' }
    ],
    faults: [
      { code:'low-verticals', severity:'med' },
      { code:'insufficient-side-bend', severity:'med' }
    ],
    ts: new Date().toISOString(),
  };
}
