import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 60;

function newestMp4(dir: string): { dir: string; file: string; t: number; size: number } | null {
  try {
    if (!fs.existsSync(dir)) return null;
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith(".mp4"))
      .map((f) => {
        const full = path.join(dir, f);
        const st = fs.statSync(full);
        return { dir, file: f, t: st.mtimeMs, size: st.size };
      })
      .filter((x) => x.size > 0)
      .sort((a, b) => b.t - a.t);

    return files[0] ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const dataUploads = path.join(process.cwd(), ".data", "uploads");
    const publicUploads = path.join(process.cwd(), "public", "uploads");

    const pick = newestMp4(dataUploads) ?? newestMp4(publicUploads);

    if (!pick) return NextResponse.json({ url: "" }, { status: 200 });

    // If from .data/uploads, serve via streaming route (Range-capable)
    if (pick.dir === dataUploads) {
      return NextResponse.json({ url: `/api/demo-video/file?name=${encodeURIComponent(pick.file)}` }, { status: 200 });
    }

    // If from /tmp/vca_uploads, serve as static
    return NextResponse.json({ url: `/uploads/${pick.file}` }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ url: "", error: String(e?.message || e) }, { status: 200 });
  }
}

