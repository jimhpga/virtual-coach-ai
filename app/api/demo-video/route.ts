import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      return NextResponse.json({ url: "" }, { status: 200 });
    }

    const files = fs
      .readdirSync(uploadsDir)
      .filter((f) => f.toLowerCase().endsWith(".mp4"))
      .map((f) => {
        const full = path.join(uploadsDir, f);
        const st = fs.statSync(full);
        return { f, t: st.mtimeMs, size: st.size };
      })
      .filter((x) => x.size > 0)
      .sort((a, b) => b.t - a.t);

    const latest = files[0]?.f ?? "";
    return NextResponse.json({ url: latest ? `/uploads/${latest}` : "" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ url: "", error: String(e?.message || e) }, { status: 200 });
  }
}
