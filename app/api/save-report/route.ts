import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function cleanId(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
  return safe.slice(0, 96) || null;
}

export async function POST(req: Request) {
  try {
    const body: any = await req.json().catch(() => ({}));

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Missing BLOB_READ_WRITE_TOKEN" },
        { status: 500 }
      );
    }

    const id =
      cleanId(body?.id) ??
      cleanId(body?.jobId) ??
      `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const createdAt = body?.createdAt ?? new Date().toISOString();
    const shouldQueue = Boolean(
      body?.muxUploadId &&
      !body?.analysisEngine &&
      !["measured", "measured_partial", "incomplete_swing"].includes(
        String(body?.analysisStatus ?? "")
      )
    );

    const report = {
      ...body,
      id,
      createdAt,
      status: body?.status ?? "ready",
      schemaVersion: body?.schemaVersion ?? "1.0",
      analysisStatus: shouldQueue
        ? "queued"
        : (body?.analysisStatus ?? null),
      analysisQueuedAt: shouldQueue
        ? (body?.analysisQueuedAt ?? createdAt)
        : (body?.analysisQueuedAt ?? null),
    };

    const pathname = `reports/${id}.json`;
    const blob = await put(pathname, JSON.stringify(report), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    let queueStored = false;
    let queuePathname: string | null = null;

    if (shouldQueue) {
      queuePathname = `analysis-queue/${id}.json`;
      const queuePayload = {
        id,
        reportPathname: pathname,
        reportUrl: blob.url,
        muxUploadId: body.muxUploadId,
        status: "queued",
        createdAt,
        updatedAt: createdAt,
        attempt: 0,
      };

      await put(queuePathname, JSON.stringify(queuePayload), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      queueStored = true;
    }

    return NextResponse.json(
      {
        ok: true,
        id,
        url: blob.url,
        pathname: blob.pathname,
        analysisStatus: report.analysisStatus,
        queueStored,
        queuePathname,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "save-report failed" },
      { status: 500 }
    );
  }
}
