import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { spawn } from "child_process";

// IMPORTANT: this route handles large files and writes to disk.
// Next.js App Router route handlers run on Node (not Edge) by default,
// but we also force it here for safety.
export const runtime = "nodejs";

// If you hit body size limits, you can raise this.
// (In dev it’s usually fine. On some hosts, request limits still apply.)
export const maxDuration = 60;
function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function safeExt(filename: string) {
  const ext = (path.extname(filename || "") || "").toLowerCase();
  // iPhone often sends .MOV or .mov, sometimes .mp4
  if (ext === ".mov" || ext === ".mp4" || ext === ".m4v") return ext;
  return ".bin";
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", args, { windowsHide: true });

    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));

    p.on("error", (err) => reject(err));
    p.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg failed (code ${code}). ${stderr.slice(-2000)}`));
    });
  });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file field named 'file' found." }, { status: 400 });
    }

    const uploadId = uid();
    const originalName = (file as any).name || "upload";
    const inExt = safeExt(originalName);

    // Where we store ONLY the reduced video (publicly accessible)
    const publicUploadsDir = path.join(process.cwd(), "public", "uploads");
    ensureDir(publicUploadsDir);

    // Temp input file (deleted after conversion)
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vca-upload-"));
    const tmpIn = path.join(tmpDir, `${uploadId}${inExt}`);

    // Final reduced file name (stable + simple)
    const outName = `${uploadId}.mp4`;
    const outPath = path.join(publicUploadsDir, outName);

    // Write upload to temp
    const ab = await file.arrayBuffer();
    fs.writeFileSync(tmpIn, Buffer.from(ab));

    // Convert + reduce:
    // - H.264 (widely compatible)
    // - 720p max (good enough for analysis + small)
    // - 30 fps cap (cuts size, keeps motion readable)
    // - CRF 28 (smaller file; tune later if needed)
    // - faststart for streaming in browser
    //
    // NOTE: if your ffmpeg supports it, this will handle iPhone HEVC too.
    const ffArgs = [
      "-y",
      "-i", tmpIn,
      "-vf", "scale='min(1280,iw)':'-2'",
      "-r", "30",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "28",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-c:a", "aac",
      "-b:a", "128k",
      outPath,
    ];

    await runFfmpeg(ffArgs);

    // Cleanup temp input + dir
    try { fs.unlinkSync(tmpIn); } catch {}
    try { fs.rmdirSync(tmpDir, { recursive: true } as any); } catch {}

    const stat = fs.statSync(outPath);
    const sizeMB = Math.round((stat.size / (1024 * 1024)) * 10) / 10;

    // Return a URL path that the frontend can use immediately
    const publicUrl = `/uploads/${outName}`;

    return NextResponse.json({
      ok: true,
      uploadId,
      final: {
        filename: outName,
        sizeMB,
        url: publicUrl,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// Optional: make GET return a helpful message (so curl -i /api/upload isn't "mysterious")
export async function GET() {
  return NextResponse.json({ ok: false, error: "Use POST with multipart form-data field named 'file'." }, { status: 405 });
}


