import fs from "fs";
import path from "path";
import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function unwrapPayload(json: any) {
  return json && json.payload ? json.payload : json;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const localCandidates = [
    path.join(process.cwd(), ".data", "jobs", String(id), "response.json"),
    path.join(process.cwd(), ".vca", "jobs", `${id}.json`),
  ];

  for (const filePath of localCandidates) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      return NextResponse.json(unwrapPayload(JSON.parse(raw)), {
        status: 200,
        headers: { "Cache-Control": "no-store", "X-VCA-Job-Storage": "local" },
      });
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, jobId: id, error: e?.message || "Failed to read local job." },
        { status: 500 }
      );
    }
  }

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const pathname = `jobs/${id}.json`;
      const found = await list({
        prefix: pathname,
        limit: 10,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      const blob = found.blobs.find((item) => item.pathname === pathname);
      if (blob) {
        const res = await fetch(blob.url, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Blob fetch failed: ${res.status}`);
        }
        const json = await res.json();
        return NextResponse.json(unwrapPayload(json), {
          status: 200,
          headers: { "Cache-Control": "no-store", "X-VCA-Job-Storage": "blob" },
        });
      }
    }
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, jobId: id, error: e?.message || "Failed to read Blob job." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { ok: false, jobId: id, error: "Job not found." },
    { status: 404, headers: { "Cache-Control": "no-store" } }
  );
}
