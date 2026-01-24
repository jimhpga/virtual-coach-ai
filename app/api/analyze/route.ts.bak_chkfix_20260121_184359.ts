import { NextResponse } from "next/server";
import { applyDeterministicCoaching } from "../../lib/deterministicCoach";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

async function __persistJob(jobId: string, payload: any) {
  try {
    if (!jobId) return;
    if (process.env.NODE_ENV === "production") return;

    // Primary job store used by /api/job/[id]
    const jobsDir = path.join(process.cwd(), ".vca", "jobs");
    await mkdir(jobsDir, { recursive: true });
    const p = path.join(jobsDir, `${jobId}.json`);
    await writeFile(p, JSON.stringify(payload, null, 2), "utf8");
  } catch {}
}
async function __vcaDump(tag: string, payload: any) {
  try {
    if (process.env.NODE_ENV === "production") return;

    const jobId =
      payload?.id ??
      payload?.jobId ??
      payload?.job?.id ??
      payload?.data?.id ??
      `dev_${Date.now()}`;

    const dir = path.join(process.cwd(), ".data", "jobs", String(jobId));
    await mkdir(dir, { recursive: true });

    const write = async (name: string, obj: any) => {
      if (obj === undefined) return;
      const p = path.join(dir, name);
      await writeFile(p, JSON.stringify(obj, null, 2), "utf8");
    };

    await write("response.json", payload);
    await write(`${tag}.json`, payload);

    // Optional common keys (if present)
    await write("ai_raw.json", payload?.ai_raw ?? payload?.aiRaw ?? payload?.raw ?? payload?.model_raw);
    await write("ai_parsed.json", payload?.ai_parsed ?? payload?.aiParsed ?? payload?.parsed ?? payload?.model_parsed);
    await write("ai_summary.json", payload?.ai_summary ?? payload?.aiSummary ?? payload?.summary ?? payload?.report);
  } catch {}
}

function __normalizeReport(report: any) {
  try {
    if (!report || typeof report !== "object") return report;
    report.headline = String(report.headline || "P1-P9 frames ready.").replace(/P1[–Ã¢]P9/g, "P1-P9");
    if (!Array.isArray(report.topFaults)) report.topFaults = [];
    return report;
  } catch { return report; }
}

export const runtime = "nodejs";

type ExtractResp = {
  ok: boolean;
  jobId?: string;
  videoUrl?: string;
  framesDir?: string; // "/frames/<jobId>"
  frames?: Array<{ p: number; label: string; file: string; url: string }>;
  error?: string;
};

export async function POST(req: Request) {
  const __dbgId = `dev_${Date.now()}`;
    let __dumpId = __dbgId;
let __dbgPayload: any = null;
let __dbgError: any = null;

  // Ensure jobId exists even if we fail before parsing body
  let jobId = `dev_${Date.now()}`;
  try {
    const body = await req.json().catch(() => ({}));
    jobId = String(body?.jobId || body?.uploadId || `dev_${Date.now()}`);
    const videoUrl = String(body?.videoUrl || "");
    const uploadId = String(body?.uploadId || "");

    const impactSec =
      (typeof body?.impactSec === "number" && body.impactSec > 0)
        ? body.impactSec
        : 2.5;

    const v = videoUrl || (uploadId ? `/uploads/${uploadId}` : "");

    if (!v || !v.startsWith("/uploads/")) {
      __dbgPayload = { ok: false, jobId, error: "videoUrl must start with /uploads/" };
      return NextResponse.json(__dbgPayload, { status: 400 });
    }

    const base = new URL(req.url).origin;

    // Call extract-pframes (creates /public/frames/<jobId>/p1..p9.jpg)
    const r = await fetch(`${base}/api/extract-pframes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoUrl: v, impactSec }),
    });

    const data = (await r.json().catch(() => null)) as ExtractResp | null;

    if (!r.ok || !data || !data.ok) {
      __dbgPayload = { ok: false, jobId, error: data?.error || `extract-pframes failed (${r.status})` };
      return NextResponse.json(__dbgPayload, { status: 500 });
    }

    const framesDir = data.framesDir || "";
    const frames = Array.isArray(data.frames) ? data.frames : [];

    const pframes = frames
      .slice()
      .sort((a, b) => (a.p || 0) - (b.p || 0))
      .map((f) => ({
        p: f.p,
        label: f.label || `P${f.p}`,
        imageUrl: f.url,
        thumbUrl: f.url,
      }));

    const report = {
      id: jobId,
      createdAt: new Date().toISOString(),
      headline: "P1-P9 frames ready.",
      swingScore: 72,
      topFaults: [],
      checkpoints: pframes.map((pf) => ({ p: pf.p, label: pf.label, note: "-" })),
      pframes,
      framesDir,
      // Stable report shape (future-proof)
      powerLeaks: [],
      topFixes: [],
      practicePlan: []
    };

    // Stable report shape (future-proof, comma-proof)
    try {
      (report as any).powerLeaks = Array.isArray((report as any).powerLeaks) ? (report as any).powerLeaks : [];
      (report as any).topFixes = Array.isArray((report as any).topFixes) ? (report as any).topFixes : [];
      (report as any).practicePlan = Array.isArray((report as any).practicePlan) ? (report as any).practicePlan : [];
    } catch {}


    // Stable report shape (future-proof, comma-proof)
    try {
      (report as any).powerLeaks = Array.isArray((report as any).powerLeaks) ? (report as any).powerLeaks : [];
      (report as any).topFixes = Array.isArray((report as any).topFixes) ? (report as any).topFixes : [];
      (report as any).practicePlan = Array.isArray((report as any).practicePlan) ? (report as any).practicePlan : [];
    } catch {}


    // Finish-line guardrail: never show more than top 3 faults
    report.topFaults = Array.isArray(report.topFaults) ? report.topFaults.slice(0, 3) : [];

    applyDeterministicCoaching(report);

    // Guardrails (MVP + long-term stability)
    try {
      // Always arrays (UI expects them)
      if (!Array.isArray((report as any).topFaults)) (report as any).topFaults = [];
      if (!Array.isArray((report as any).powerLeaks)) (report as any).powerLeaks = [];
      if (!Array.isArray((report as any).topFixes)) (report as any).topFixes = [];
      if (!Array.isArray((report as any).practicePlan)) (report as any).practicePlan = [];

      // Caps
      (report as any).topFaults = (report as any).topFaults.slice(0, 3);

      const cap2 = (arr: any) => (Array.isArray(arr) ? arr.slice(0, 2) : []);

      // If any items contain drills arrays, cap them to 2
      for (const item of (report as any).powerLeaks) {
        if (item && Array.isArray((item as any).drills)) (item as any).drills = cap2((item as any).drills);
      }
      for (const item of (report as any).topFixes) {
        if (item && Array.isArray((item as any).drills)) (item as any).drills = cap2((item as any).drills);
      }
      for (const item of (report as any).practicePlan) {
        if (item && Array.isArray((item as any).drills)) (item as any).drills = cap2((item as any).drills);
      }
    } catch {}
// Guardrails (MVP + long-term stability)
    try {
      // Always arrays (UI expects them)
      if (!Array.isArray((report as any).topFaults)) (report as any).topFaults = [];
      if (!Array.isArray((report as any).powerLeaks)) (report as any).powerLeaks = [];
      if (!Array.isArray((report as any).topFixes)) (report as any).topFixes = [];
      if (!Array.isArray((report as any).practicePlan)) (report as any).practicePlan = [];

      // Caps
      (report as any).topFaults = (report as any).topFaults.slice(0, 3);

      $cap2 = (arr: any) => Array.isArray(arr) ? arr.slice(0, 2) : [];

      // If any items contain drills arrays, cap them to 2
      for (const item of (report as any).powerLeaks) {
        if (item && Array.isArray((item as any).drills)) (item as any).drills = $cap2((item as any).drills);
      }
      for (const item of (report as any).topFixes) {
        if (item && Array.isArray((item as any).drills)) (item as any).drills = $cap2((item as any).drills);
      }
      for (const item of (report as any).practicePlan) {
        if (item && Array.isArray((item as any).drills)) (item as any).drills = $cap2((item as any).drills);
      }
    } catch {}
// MVP guardrail: cap drills to 2 (safe, targeted)
    try {
      const pl = (report as any)?.powerLeaks;
      if (Array.isArray(pl)) {
        for (const item of pl) {
          if (item && Array.isArray((item as any).drills)) {
            (item as any).drills = (item as any).drills.slice(0, 2);
          }
        }
      }
    } catch {}
// MVP guardrail: cap drills to 2 (safe, targeted)
    try {
      const pl = (report as any)?.powerLeaks;
      if (Array.isArray(pl)) {
        for (const item of pl) {
          if (item && Array.isArray((item as any).drills)) {
            (item as any).drills = (item as any).drills.slice(0, 2);
          }
        }
      }
    } catch {}
__normalizeReport(report);

    __dbgPayload = { ok: true, jobId,
      videoUrl: v,
      framesDir,
      frames,
      report,
    };

    await __persistJob(jobId, __dbgPayload);
    return NextResponse.json(__dbgPayload);
  } catch (e: any) {
    __dbgError = { message: e?.message || "Analyze failed", stack: e?.stack };
    __dbgPayload = { ok: false, jobId, error: e?.message || "Analyze failed" };
    return NextResponse.json(__dbgPayload, { status: 500 });
  } finally {
    try {
      await __vcaDump("analyze", { id: __dumpId, ok: !!__dbgPayload?.ok, error: __dbgError, payload: __dbgPayload });
    } catch {}
  }
}


















