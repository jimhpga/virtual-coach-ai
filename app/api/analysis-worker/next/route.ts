import Mux from "@mux/mux-node";
import { list, put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { workerAuthorized } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function leaseFresh(value: unknown) {
  const t = Date.parse(String(value || ""));
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < 20 * 60 * 1000;
}

export async function GET(req: Request) {
  try {
    const auth = workerAuthorized(req);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "BLOB_READ_WRITE_TOKEN is not configured" },
        { status: 503 }
      );
    }

    const muxTokenId = process.env.MUX_TOKEN_ID;
    const muxTokenSecret = process.env.MUX_TOKEN_SECRET;
    if (!muxTokenId || !muxTokenSecret) {
      return NextResponse.json(
        { ok: false, error: "Mux credentials are not configured" },
        { status: 503 }
      );
    }

    const mux = new Mux({ tokenId: muxTokenId, tokenSecret: muxTokenSecret });

    const queueList = await list({
      prefix: "analysis-queue/",
      limit: 100,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const queueBlobs = [...queueList.blobs].sort(
      (a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime()
    );

    for (const queueBlob of queueBlobs) {
      let queue: any = null;
      try {
        queue = await readJsonUrl(queueBlob.url);
      } catch {
        continue;
      }

      if (!queue?.id) continue;
      if (
        String(queue.status || "") === "processing" &&
        leaseFresh(queue.claimedAt)
      ) {
        continue;
      }

      const reportPathname =
        String(queue.reportPathname || "") || `reports/${queue.id}.json`;
      const reportBlob = await findExactBlob(reportPathname);
      if (!reportBlob) continue;

      let report: any = null;
      try {
        report = await readJsonUrl(reportBlob.url);
      } catch {
        continue;
      }

      let playbackId = String(report?.muxPlaybackId || "");
      const uploadId = String(report?.muxUploadId || queue?.muxUploadId || "");

      if (!playbackId && uploadId) {
        try {
          const upload = await mux.video.uploads.retrieve(uploadId);
          const assetId = upload.asset_id ?? null;
          if (assetId) {
            const asset = await mux.video.assets.retrieve(assetId);
            playbackId = asset.playback_ids?.[0]?.id ?? "";

            if (playbackId) {
              report = {
                ...report,
                muxPlaybackId: playbackId,
                muxUploadId: null,
                muxAssetId: assetId,
                updatedAt: new Date().toISOString(),
              };

              await put(reportPathname, JSON.stringify(report), {
                access: "public",
                contentType: "application/json",
                addRandomSuffix: false,
                allowOverwrite: true,
                token: process.env.BLOB_READ_WRITE_TOKEN,
              });
            }
          }
        } catch {
          continue;
        }
      }

      if (!playbackId) continue;

      const leaseId = randomUUID();
      const now = new Date().toISOString();
      const claimed = {
        ...queue,
        status: "processing",
        claimedAt: now,
        updatedAt: now,
        leaseId,
        attempt: Number(queue.attempt || 0) + 1,
      };

      await put(queueBlob.pathname, JSON.stringify(claimed), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      return NextResponse.json(
        {
          ok: true,
          job: {
            id: String(queue.id),
            leaseId,
            reportPathname,
            reportUrl: reportBlob.url,
            muxPlaybackId: playbackId,
            sourceUrl: `https://stream.mux.com/${playbackId}.m3u8`,
            attempt: claimed.attempt,
          },
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { ok: true, job: null },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "worker-next failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
