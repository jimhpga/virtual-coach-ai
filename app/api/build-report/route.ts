import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import fs from "fs";

async function __vcaDump(tag: string, payload: any) {
  try {
    if (process.env.NODE_ENV === "production") return;

    const jobId =
      payload?.id ??
      payload?.jobId ??
      payload?.job?.id ??
      payload?.data?.id ??
      `dev_${Date.now()}`;

    const base = process.env.VCA_DATA_DIR || __vcaDataRoot();
    const dir = path.join(base, "jobs", String(jobId));
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

// IMPORTANT: we call extract-pframes route handler as a module function (no HTTP hop)
import { POST as ExtractPframesPOST } from "../extract-pframes/route";

  // ===== VCA_DATA_ROOT_HELPER_V1 =====
  function __vcaDataRoot(): string {
    const env = process.env.VCA_DATA_DIR;
    if (env && env.trim()) return env.trim();
    // Vercel runtime/build: write only to /tmp (repo root isn't safe for writes)
    if (process.env.VERCEL) return "/tmp/vca-data";
    return __vcaDataRoot();
  }
  // ===== END VCA_DATA_ROOT_HELPER_V1 =====


export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const localPath = typeof body?.localPath === "string" ? body.localPath : null;
    const videoUrl = typeof body?.videoUrl === "string" ? body.videoUrl : null;
    const pathname = typeof body?.pathname === "string" ? body.pathname : null;

    // optional but recommended (we can pass through to extract-pframes)
    const impactSec =
      typeof body?.impactSec === "number" ? body.impactSec : null;

    if (!localPath && !videoUrl) {
      return NextResponse.json(
        { ok: false, error: "localPath or videoUrl is required." },
        { status: 400 }
      );
    }

    // Build a fake Request to the extract-pframes handler
    const extractReq = new Request("http://local/api/extract-pframes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        localPath,
        videoUrl,
        pathname,
        impactSec,
      }),
    });

    const extractRes = await ExtractPframesPOST(extractReq as any);
    const extractJson = await extractRes.json().catch(() => ({}));

    if (!extractRes.ok || !extractJson?.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "extract-pframes failed.",
          detail: extractJson,
        },
        { status: 500 }
      );
    }

    // normalize stable shapes
    const report = {
      id: `rpt_${Date.now()}`,
      createdAt: new Date().toISOString(),
      headline: String(extractJson?.headline || "P1-P10 frames ready.").replace(
        /P1[-â]P9/g,
        "P1-P10"
      ),
      swingScore: Number(extractJson?.swingScore || 72),
      topFaults: Array.isArray(extractJson?.topFaults) ? extractJson.topFaults : [],
      checkpoints: Array.isArray(extractJson?.checkpoints) ? extractJson.checkpoints : [],
      pframes: Array.isArray(extractJson?.pframes) ? extractJson.pframes : [],
      framesDir: extractJson?.framesDir || null,
      meta: extractJson?.meta || {
        durationSec: null,
        impactSec: impactSec,
        source: { localPath, videoUrl, pathname },
      },
    };

    const reportsDir = path.join(process.cwd(), "reports");
    await fs.promises.mkdir(reportsDir, { recursive: true });

    const ts = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\..+/, "")
      .replace("T", "_");
    const outPath = path.join(reportsDir, `report_${ts}.json`);

    await fs.promises.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

    return NextResponse.json({
      ok: true,
      saved: { outPath: outPath.replace(process.cwd(), "").replace(/\\/g, "/") },
      report,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "build-report failed" },
      { status: 500 }
    );
  }
}




