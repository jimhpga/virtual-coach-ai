import { list, put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body: any = await req.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const uploadId =
      typeof body?.uploadId === "string" ? body.uploadId.trim() : "";

    if (!id || !uploadId) {
      return NextResponse.json(
        { ok: false, error: "Missing id or uploadId" },
        { status: 400 }
      );
    }

    const muxId = process.env.MUX_TOKEN_ID;
    const muxSecret = process.env.MUX_TOKEN_SECRET;
    if (!muxId || !muxSecret) {
      return NextResponse.json(
        { ok: false, error: "Mux credentials are not configured" },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${muxId}:${muxSecret}`).toString("base64");

    const uploadRes = await fetch(
      `https://api.mux.com/video/v1/uploads/${encodeURIComponent(uploadId)}`,
      {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      }
    );
    const uploadJson = await uploadRes.json().catch(() => ({}));

    if (!uploadRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Mux upload lookup failed",
          detail: uploadJson,
        },
        { status: uploadRes.status }
      );
    }

    const assetId = uploadJson?.data?.asset_id;
    if (!assetId) {
      return NextResponse.json(
        { ok: true, status: "pending", id, uploadId },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    const assetRes = await fetch(
      `https://api.mux.com/video/v1/assets/${encodeURIComponent(assetId)}`,
      {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      }
    );
    const assetJson = await assetRes.json().catch(() => ({}));

    if (!assetRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Mux asset lookup failed",
          detail: assetJson,
        },
        { status: assetRes.status }
      );
    }

    const playbackId = assetJson?.data?.playback_ids?.[0]?.id;
    if (!playbackId) {
      return NextResponse.json(
        { ok: true, status: "pending", id, uploadId, assetId },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          ok: true,
          status: "ready",
          id,
          uploadId,
          assetId,
          playbackId,
          reportPatched: false,
          warning: "Missing BLOB_READ_WRITE_TOKEN",
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    const pathname = `reports/${id}.json`;
    let existing: any = {};

    try {
      const found = await list({
        prefix: pathname,
        limit: 10,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      const blob = found.blobs.find((item) => item.pathname === pathname);
      if (blob) {
        const currentRes = await fetch(blob.url, { cache: "no-store" });
        if (currentRes.ok) {
          existing = await currentRes.json().catch(() => ({}));
        }
      }
    } catch {}

    const patched = {
      ...existing,
      id,
      status: "ready",
      muxPlaybackId: playbackId,
      muxUploadId: null,
      muxAssetId: assetId,
      updatedAt: new Date().toISOString(),
    };

    const blob = await put(pathname, JSON.stringify(patched), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json(
      {
        ok: true,
        status: "ready",
        id,
        uploadId,
        assetId,
        playbackId,
        reportPatched: true,
        url: blob.url,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "resolve-mux failed" },
      { status: 500 }
    );
  }
}
