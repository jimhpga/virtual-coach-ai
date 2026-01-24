import { NextResponse } from "next/server";
import { getTopPowerLeaks } from "../../lib/powerLeakMap";
import { applyDeterministicCoaching } from "../../lib/deterministicCoach";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

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
    report.headline = String(report.headline || "P1-P9 frames ready.").replace(/P1[â�,��?o�f¢]P9/g, "P1-P9");
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
  let __dbgPayload: any = null;
  let __dbgError: any = null;

  try {
    const body = await req.json().catch(() => ({}));
    const jobId = String(body?.jobId || body?.uploadId || `dev_${Date.now()}`);
    const videoUrl = String(body?.videoUrl || "");
    const uploadId = String(body?.uploadId || "");

    
    // GOLDEN FALLBACK: allow demo analyze without uploads
    const golden = body?.golden === 1 || body?.golden === true || body?.golden === "1";
    if (golden || (!videoUrl && !uploadId)) {
      const report = {
        id: jobId,
        createdAt: new Date().toISOString(),
        headline: "Golden demo report (no upload).",
        swingScore: 78,
        topFaults: [
          { key: "face_open", title: "Face slightly open", severity: "medium" },
          { key: "early_ext", title: "Early extension", severity: "low" }
        ],
        checkpoints: Array.from({ length: 9 }).map((_, i) => ({
          p: i + 1,
          label: `P${i + 1}`,
          note: "-"
        })),
        pframes: Array.from({ length: 9 }).map((_, i) => ({
          p: i + 1,
          label: `P${i + 1}`,
          imageUrl: `/golden/p${i + 1}.jpg`,
          thumbUrl: `/golden/p${i + 1}.jpg`
        })),
        framesDir: "/golden"
      };
    report.powerLeaks = getTopPowerLeaks(report);

      try { applyDeterministicCoaching(report as any); } catch {}
      try { __normalizeReport(report as any); } catch {}

      const payload = { ok: true, jobId, videoUrl: "/golden", framesDir: "/golden", frames: [], report };
      await __vcaDump("analyze", payload);
      return NextResponse.json(payload, { status: 200 });
    }
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
      body: JSON.stringify({ videoUrl: v }),
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
    };
    report.powerLeaks = getTopPowerLeaks(report);
    applyDeterministicCoaching(report);

    __normalizeReport(report);

    __dbgPayload = { ok: true, jobId,
      videoUrl: v,
      framesDir,
      frames,
      report,
    };

    return NextResponse.json(__dbgPayload);
  } catch (e: any) {
    __dbgError = { message: e?.message || "Analyze failed", stack: e?.stack };
    __dbgPayload = { ok: false, jobId, error: e?.message || "Analyze failed" };
    return NextResponse.json(__dbgPayload, { status: 500 });
  } finally {
    try {
      await __vcaDump("analyze", { id: __dbgId, ok: !!__dbgPayload?.ok, error: __dbgError, payload: __dbgPayload });
    } catch {}
  }
}










