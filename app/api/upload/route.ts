import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json(
        { ok: false, error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const file = form.get("video");
    const refClipId = String(form.get("refClipId") || "");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { ok: false, error: "Missing form field 'video'" },
        { status: 400 }
      );
    }

    const f = file as File;

    // Upload to Vercel Blob (works in prod + local if token is present)
    const blob = await put(
      `uploads/${Date.now()}-${f.name}`,
      f,
      {
        access: "public",
        contentType: f.type || "video/mp4",
      }
    );

    return NextResponse.json({
      ok: true,
      videoUrl: blob.url,
      refClipId,
    });
  } catch (e: any) {
    console.error("[upload] error", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
