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

    return NextResponse.json({ report });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

