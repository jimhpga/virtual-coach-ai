import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { mkdir } from "fs/promises";

  // ===== VCA_DATA_ROOT_HELPER_V1 =====
  function __vcaDataRoot(): string {
    const env = process.env.VCA_DATA_DIR;
    if (env && env.trim()) return env.trim();
    // Vercel runtime/build: write only to /tmp (repo root isn't safe for writes)
    if (process.env.VERCEL) return "/tmp/vca-data";
    return __vcaDataRoot();
  }
  // ===== END VCA_DATA_ROOT_HELPER_V1 =====


export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return new Response("Missing name", { status: 400 });

  // Prevent path traversal
  const safeName = path.basename(name);
  if (safeName !== name) return new Response("Invalid filename", { status: 400 });

  const filePath = path.join(__vcaDataRoot(), "uploads", safeName);
await mkdir(filePath, { recursive: true });
  if (!fs.existsSync(filePath)) return new Response("Not found", { status: 404 });

  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size <= 0) return new Response("Not found", { status: 404 });

  const range = req.headers.get("range");

  const baseHeaders: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",  };

  // No Range header: send whole file
  if (!range) {
    return new Response(fs.createReadStream(filePath) as any, {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Length": String(stat.size),
      },
    });
  }

  // Range header present: bytes=start-end
  const m = /^bytes=(\d+)-(\d+)?$/.exec(range);
  if (!m) {
    return new Response("Invalid range", {
      status: 416,
      headers: { ...baseHeaders, "Content-Range": `bytes */${stat.size}` },
    });
  }

  const start = parseInt(m[1], 10);
  const end = m[2] ? parseInt(m[2], 10) : stat.size - 1;

  if (start >= stat.size || end >= stat.size || start > end) {
    return new Response("Range not satisfiable", {
      status: 416,
      headers: { ...baseHeaders, "Content-Range": `bytes */${stat.size}` },
    });
  }

  const chunkSize = end - start + 1;

  return new Response(fs.createReadStream(filePath, { start, end }) as any, {
    status: 206,
    headers: {
      ...baseHeaders,
      "Content-Length": String(chunkSize),
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
    },
  });
}

