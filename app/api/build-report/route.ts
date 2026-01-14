import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// IMPORTANT: we call extract-pframes route handler as a module function (no HTTP hop)
import { POST as ExtractPframesPOST } from "../extract-pframes/route";

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
      headline: String(extractJson?.headline || "P1-P9 frames ready.").replace(
        /P1[–â]P9/g,
        "P1-P9"
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
