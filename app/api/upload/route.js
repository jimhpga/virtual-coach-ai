import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function safeName(name) {
  return String(name || "upload.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed." }, { status: 405 });
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("video");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ ok: false, error: "Missing video file (field name must be 'video')." }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outName = `${stamp}-${safeName(file.name)}`;
    const outPath = path.join(uploadsDir, outName);

    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(outPath, buf);

    return NextResponse.json({ ok: true, videoUrl: `/uploads/${outName}`, fileName: outName, bytes: buf.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Upload failed." }, { status: 500 });
  }
}
