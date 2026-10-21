import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { workerAuthorized } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanId(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  return raw.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 96);
}

export async function POST(req: Request) {
  try {
    const auth = workerAuthorized(req);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "BLOB_READ_WRITE_TOKEN is not configured" },
        { status: 503 }
      );
    }

    const form = await req.formData();
    const id = cleanId(form.get("id"));
    const phase = String(form.get("phase") || "").toUpperCase();
    const file = form.get("file");

    if (!id || !/^P(?:10|[1-9])$/.test(phase)) {
      return NextResponse.json(
        { ok: false, error: "Valid id and phase P1-P10 are required" },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Missing image file" },
        { status: 400 }
      );
    }

    const type = String(file.type || "").toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(type)) {
      return NextResponse.json(
        { ok: false, error: "P-frame image must be JPEG, PNG, or WebP" },
        { status: 415 }
      );
    }

    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "P-frame image exceeds 3MB" },
        { status: 413 }
      );
    }

    const ext =
      type === "image/png" ? "png" :
      type === "image/webp" ? "webp" :
      "jpg";
    const pathname = `analysis-assets/${id}/${phase}.${ext}`;
    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type || "image/png",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json(
      {
        ok: true,
        id,
        phase,
        url: blob.url,
        pathname: blob.pathname,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "worker-asset failed" },
      { status: 500 }
    );
  }
}
