import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const id = String(Date.now());

  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json({ ok: false, error: "Expected multipart/form-data (field name: video)" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("video");
    const refClipId = String(form.get("refClipId") || "");

    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, error: "Missing file field 'video'" }, { status: 400 });
    }

    const f = file as File;

    // ---- Save LOCAL copy for extract-pframes ----
    const safeName = (f.name || "upload.mp4").replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const localRel = `uploads/${id}-${safeName}`;             // what extract-pframes wants
    const localPath = path.join(process.cwd(), "public", localRel);

    fs.mkdirSync(path.dirname(localPath), { recursive: true });

    const bytes = await f.arrayBuffer();
    const buf = Buffer.from(bytes);
    fs.writeFileSync(localPath, buf);

    // ---- Optional: also upload to Vercel Blob ----
    // If blob upload fails locally (missing token), we still succeed because local file exists.
    let blobUrl: string | null = null;
    try {
      const blob = await put(localRel, f, {
        access: "public",
        contentType: f.type || "video/mp4",
      });
      blobUrl = (blob as any).url || null;
    } catch (e) {
      // ignore blob errors in local dev
      blobUrl = null;
    }

    return NextResponse.json({
      ok: true,
      jobId: id,
      filename: localRel,                 // e.g. "uploads/1767-foo.mp4" (LOCAL)
      videoUrl: blobUrl ?? `/${localRel}`, // blob url if available, else "/uploads/..."
      sizeBytes: buf.length,
      refClipId,
    });
  } catch (e: any) {
    console.error("[upload] error", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Upload failed." },
      { status: 500 }
    );
  }
}
