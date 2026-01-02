import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json({
      ok: true,
      jobId: id,
      filename,
      videoUrl: (typeof blob !== "undefined" && blob && (blob as any).url) ? (blob as any).url : videoUrl,
      sizeBytes: (typeof buf !== "undefined" && buf) ? buf.length : undefined,
      refClipId,
    });
    }

    const form = await req.formData();
    const file = form.get("video");
    const refClipId = String(form.get("refClipId") || "");

    if (!file || typeof file === "string") {
      return NextResponse.json({
      ok: true,
      jobId: id,
      filename,
      videoUrl: (typeof blob !== "undefined" && blob && (blob as any).url) ? (blob as any).url : videoUrl,
      sizeBytes: (typeof buf !== "undefined" && buf) ? buf.length : undefined,
      refClipId,
    });
    }

    const f = file as File;

    // Upload to Vercel Blob (works in prod + local if token is present)
    const id = String(Date.now());
    const safeName = (f.name || "upload.mp4").replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filename = `uploads/${id}-${safeName}`;
    const videoUrl = `/uploads/${filename}`;
    const blob = await put(filename,
      f,
      {
        access: "public",
        contentType: f.type || "video/mp4",
      }
    );

    return NextResponse.json({
      ok: true,
      jobId: id,
      filename,
      videoUrl: (typeof blob !== "undefined" && blob && (blob as any).url) ? (blob as any).url : videoUrl,
      sizeBytes: (typeof buf !== "undefined" && buf) ? buf.length : undefined,
      refClipId,
    });
  } catch (e: any) {
    console.error("[upload] error", e);
    return NextResponse.json({
      ok: true,
      jobId: id,
      filename,
      videoUrl: (typeof blob !== "undefined" && blob && (blob as any).url) ? (blob as any).url : videoUrl,
      sizeBytes: (typeof buf !== "undefined" && buf) ? buf.length : undefined,
      refClipId,
    });
  }
}


