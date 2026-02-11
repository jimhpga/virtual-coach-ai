import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const golden = body?.golden ? true : false;

    // Try a few known locations for a "latest" report file.
    // Adjust these paths later when your real pipeline writes a report.
    const candidates = [
      // Prefer the real run output when available (local dev only)
      "E:\\VCA\\_runs\\demoSafe\\latest\\latest_pretty.json",
      "E:\\VCA\\_runs\\demoSafe\\latest\\latest_summary.json",

      path.join(process.cwd(), "public", "data", "report-beta.json"),
      path.join(process.cwd(), "data", "report-beta.json"),
      path.join(process.cwd(), "public", "data", "latest-report.json"),
      path.join(process.cwd(), "data", "latest-report.json"),
      path.join(process.cwd(), "golden", "report.json"),
      path.join(process.cwd(), "golden", "report-beta.json"),
    ];

    let picked: string | null = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) { picked = p; break; }
    }

    // If nothing exists, still return something harmless.
    let report: any = { summary: { headline: "No report file found yet." }, pframes: {}, swingScore: null };

    if (picked) {
      const txt = fs.readFileSync(picked, "utf8");
      report = JSON.parse(txt);
    }

    // If golden requested, tag it (purely UI)
    if (golden) report.mode = "demo";

            // --- VCA_P3P7_SUMMARY_INJECT (SAFE) ---
    try {
      if (report) {
        if (!(report as any).summary) (report as any).summary = {};
        const p3p7 = (report as any).p3p7;
        const conf = p3p7?.confidence;
        const pf = p3p7?.phaseFrames;
        if (!(report as any).summary.p3p7_summary && conf && pf) {
          (report as any).summary.p3p7_summary = {
            phaseFrames: pf,
            shaftPlane: {
              level: conf.shaft_plane?.level ?? "ESTIMATED",
              score01: conf.shaft_plane?.score01 ?? 0
            },
            wristDelivery: {
              level: conf.wrist_delivery?.level ?? "ESTIMATED",
              score01: conf.wrist_delivery?.score01 ?? 0
            }
          };
        }
      }
    } catch {}
    // --- /VCA_P3P7_SUMMARY_INJECT (SAFE) ---
return NextResponse.json({ report });
  } catch (e: any) {
return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}





