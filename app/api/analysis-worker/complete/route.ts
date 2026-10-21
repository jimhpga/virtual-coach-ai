import { del, list, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { workerAuthorized } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanId(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  return raw.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 96);
}

async function findExactBlob(pathname: string) {
  const found = await list({
    prefix: pathname,
    limit: 10,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return found.blobs.find((b) => b.pathname === pathname) ?? null;
}

async function readJsonUrl(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
  return res.json();
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

    const body: any = await req.json().catch(() => ({}));
    const id = cleanId(body?.id);
    const leaseId = String(body?.leaseId || "");
    const reportPatch =
      body?.reportPatch && typeof body.reportPatch === "object"
        ? body.reportPatch
        : null;
    const analysisError =
      typeof body?.error === "string" && body.error.trim()
        ? body.error.trim()
        : "";

    if (!id || !leaseId) {
      return NextResponse.json(
        { ok: false, error: "id and leaseId are required" },
        { status: 400 }
      );
    }

    const queuePathname = `analysis-queue/${id}.json`;
    const queueBlob = await findExactBlob(queuePathname);
    if (!queueBlob) {
      return NextResponse.json(
        { ok: false, error: "Queue job not found" },
        { status: 404 }
      );
    }

    const queue: any = await readJsonUrl(queueBlob.url);
    if (String(queue?.leaseId || "") !== leaseId) {
      return NextResponse.json(
        { ok: false, error: "Worker lease no longer owns this job" },
        { status: 409 }
      );
    }

    const reportPathname =
      String(queue?.reportPathname || "") || `reports/${id}.json`;
    const reportBlob = await findExactBlob(reportPathname);
    if (!reportBlob) {
      return NextResponse.json(
        { ok: false, error: "Report not found" },
        { status: 404 }
      );
    }

    const existing: any = await readJsonUrl(reportBlob.url);
    const now = new Date().toISOString();

    let merged: any;
    if (analysisError) {
      const attempt = Number(queue?.attempt || 1);

      if (attempt < 3) {
        const retryQueue = {
          ...queue,
          status: "queued",
          claimedAt: null,
          leaseId: null,
          updatedAt: now,
          lastError: analysisError,
        };

        await put(queuePathname, JSON.stringify(retryQueue), {
          access: "public",
          contentType: "application/json",
          addRandomSuffix: false,
          allowOverwrite: true,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        const retryReport = {
          ...existing,
          analysisStatus: "queued_retry",
          analysisError: {
            message: analysisError,
            at: now,
            attempt,
            retrying: true,
          },
          updatedAt: now,
        };

        const retryWritten = await put(
          reportPathname,
          JSON.stringify(retryReport),
          {
            access: "public",
            contentType: "application/json",
            addRandomSuffix: false,
            allowOverwrite: true,
            token: process.env.BLOB_READ_WRITE_TOKEN,
          }
        );

        return NextResponse.json(
          {
            ok: true,
            id,
            analysisStatus: retryReport.analysisStatus,
            reportUrl: retryWritten.url,
            retryQueued: true,
            queueCleared: false,
          },
          { status: 200, headers: { "Cache-Control": "no-store" } }
        );
      }

      merged = {
        ...existing,
        analysisStatus: "analysis_error",
        analysisError: {
          message: analysisError,
          at: now,
          attempt,
          retrying: false,
        },
        updatedAt: now,
      };
    } else {
      if (!reportPatch) {
        return NextResponse.json(
          { ok: false, error: "reportPatch is required when error is absent" },
          { status: 400 }
        );
      }

      merged = {
        ...existing,
        ...reportPatch,
        id,
        createdAt: existing?.createdAt ?? reportPatch?.createdAt ?? now,
        status: "ready",
        videoUrl:
          reportPatch?.videoUrl ?? existing?.videoUrl ?? null,
        muxPlaybackId:
          existing?.muxPlaybackId ?? reportPatch?.muxPlaybackId ?? null,
        muxUploadId:
          existing?.muxUploadId ?? reportPatch?.muxUploadId ?? null,
        muxAssetId:
          existing?.muxAssetId ?? reportPatch?.muxAssetId ?? null,
        meta: {
          ...(existing?.meta ?? {}),
          ...(reportPatch?.meta ?? {}),
          worker: {
            ...(existing?.meta?.worker ?? {}),
            ...(reportPatch?.meta?.worker ?? {}),
            completedAt: now,
            attempt: Number(queue?.attempt || 1),
          },
        },
        analyzedAt: now,
        updatedAt: now,
      };
    }

    const written = await put(reportPathname, JSON.stringify(merged), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    await del(queuePathname, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json(
      {
        ok: true,
        id,
        analysisStatus: merged.analysisStatus ?? null,
        reportUrl: written.url,
        queueCleared: true,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "worker-complete failed" },
      { status: 500 }
    );
  }
}
