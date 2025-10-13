// api/report.ts
import crypto from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

export const config = { runtime: "nodejs18.x" };

const REGION = process.env.AWS_REGION!;
const BUCKET = process.env.S3_BUCKET!;
const s3 = new S3Client({ region: REGION });

function cors(res: ResponseInit = {}): ResponseInit {
  return {
    ...res,
    headers: {
      "Access-Control-Allow-Origin": "https://virtualcoachai.net",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      ...(res.headers as any),
    },
  };
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, cors({ status: 204 }));

  if (req.method === "POST") {
    try {
      const url = new URL(req.url);
      const qsKey = url.searchParams.get("key");
      const body = await safeJson(req);
      const key = (body?.key || qsKey || "").toString();

      if (!key) return json({ ok: false, error: "MISSING_KEY" }, 400);

      // hash the key -> stable report path
      const id = crypto.createHash("sha1").update(key).digest("hex").slice(0,16);
      const reportKey = `reports/${id}.json`;

      // *** DEMO path: instantly write a ready report. Replace later with your real worker. ***
      const report = demoReport(key);
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: reportKey,
        Body: JSON.stringify(report),
        ContentType: "application/json",
      }));

      return json({ ok: true, status: report.status, reportKey, key }, 200);
    } catch (e:any) {
      return json({ ok: false, error: e.message ?? "REPORT_POST_ERROR" }, 500);
    }
  }

  if (req.method === "GET") {
    try {
      const url = new URL(req.url);
      const demo = url.searchParams.get("demo");
      const key  = url.searchParams.get("key");

      if (demo) {
        return json(demoReport(key ?? "uploads/demo.mov"), 200);
      }

      if (!key) return json({ ok: false, error: "MISSING_KEY" }, 400);

      const id = crypto.createHash("sha1").update(key).digest("hex").slice(0,16);
      const reportKey = `reports/${id}.json`;

      // Try read report
      try {
        const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: reportKey }));
        const text = await obj.Body!.transformToString();
        return json(JSON.parse(text), 200);
      } catch {
        // Not there yet
        return json({ ok: false, status: "queued", error: "NOT_READY" }, 202);
      }
    } catch (e:any) {
      return json({ ok: false, error: e.message ?? "REPORT_GET_ERROR" }, 500);
    }
  }

  return new Response("Method Not Allowed", cors({ status: 405 }));
}

function json(data: any, status=200) {
  return new Response(JSON.stringify(data), cors({
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  }));
}

async function safeJson(req: Request) {
  try { return await req.json(); } catch { return null; }
}

function demoReport(sourceKey: string) {
  return {
    ok: true,
    status: "ready",
    sourceKey,
    mode: "full-swing",
    displayMode: "exoskeleton",
    ui: { preset: "standard" },
    swingScore: 85,
    p_checkpoints: [
      { p:1, label:"Setup", grade:"GOOD", notes:"55/45; hinge ~25°; neutral" },
      { p:6, label:"Shaft parallel (DS)", grade:"WARN", notes:"Need more side bend; add vertical force" },
      { p:7, label:"Impact", grade:"GOOD", notes:"Forward shaft; ~85% lead side" }
    ],
    faults:[
      { code:"low-verticals", severity:"med" },
      { code:"insufficient-side-bend", severity:"med" }
    ],
    ts: new Date().toISOString()
  };
}
