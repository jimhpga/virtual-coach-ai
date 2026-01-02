import { NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // NOTE: Serverless (Vercel) filesystem is read-only. Writing to /public will fail in prod.
  const isProd = process.env.NODE_ENV === "production";
  const isVercel = !!process.env.VERCEL;
  if (isProd && isVercel) {
    return NextResponse.json(
      {
        ok: false,
        error: "Upload storage not configured for production (serverless filesystem is read-only). Use Mux/S3/Vercel Blob for prod uploads.",
      },
      { status: 501 }
    );
  }
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json({ ok: false, error: "Expected multipart/form-data" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("video");
    const refClipId = String(form.get("refClipId") || "");
    try { console.log("[upload] refClipId:", refClipId); } catch {}
    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, error: "Missing form field 'video'" }, { status: 400 });
    }

    const f = file as File;
    const buf = Buffer.from(await f.arrayBuffer());

    const id = new Date().toISOString().replace(/[:.]/g, "-") + "-" + Math.random().toString(16).slice(2, 10);
    const safeName = (f.name || "upload.mp4").replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filename = `${id}-${safeName}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const abs = path.join(uploadsDir, filename);
    await writeFile(abs, buf);

    const videoUrl = `/uploads/${filename}`;
    return NextResponse.json({
      refClipId,
      ok: true,
      jobId: id,
      filename,
      videoUrl,
      sizeBytes: buf.length
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Upload failed" }, { status: 500 });
  }
}



