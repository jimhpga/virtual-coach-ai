"use client";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";

type Body = {
  localPath?: string;
  videoUrl?: string;
  pathname?: string;
  impactSec?: number;
};

function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) return reject(new Error((stderr || stdout || err.message).toString()));
      resolve({ stdout: (stdout || "").toString(), stderr: (stderr || "").toString() });
    });
  });
}

async function downloadToFile(url: string, outPath: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const arr = new Uint8Array(await res.arrayBuffer());
  await fs.promises.writeFile(outPath, arr);
}

async function ffprobeDurationSeconds(inputPath: string): Promise<number> {
  const { stdout } = await run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "json",
    inputPath,
  ]);
  const j = JSON.parse(stdout);
  const d = Number(j?.format?.duration || 0) || 0;
  return d;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function linspace(a: number, b: number, n: number) {
  if (n <= 1) return [a];
  const out: number[] = [];
  const step = (b - a) / (n - 1);
  for (let i = 0; i < n; i++) out.push(a + step * i);
  return out;
}

export async function POST(req: Request) {
  let tmpDir: string | null = null;
  let tempInput: string | null = null;

  try {
    const body = (await req.json()) as Body;

    const localPath = typeof body.localPath === "string" ? body.localPath : null;
    const videoUrl  = typeof body.videoUrl === "string" ? body.videoUrl : null;
    const pathname  = typeof body.pathname === "string" ? body.pathname : null;
    const impactSec = typeof body.impactSec === "number" ? body.impactSec : null;

    if (!impactSec || impactSec <= 0) {
      return NextResponse.json({ ok: false, error: "impactSec missing." }, { status: 400 });
    }
    if (!localPath && !videoUrl) {
      return NextResponse.json({ ok: false, error: "Provide localPath or videoUrl." }, { status: 400 });
    }

    // Decide input file path
    let inputPath = localPath || "";

    if (!inputPath && videoUrl) {
      // download URL to tmp
      tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "vca-pframes-"));
      const safeName =
        (pathname && pathname.trim()) ||
        `upload-${Date.now()}.mp4`;

      const fileName = safeName.replace(/[^\w.\-]+/g, "_");
      tempInput = path.join(tmpDir, fileName);
      await downloadToFile(videoUrl, tempInput);
      inputPath = tempInput;
    }

    if (!fs.existsSync(inputPath)) {
      return NextResponse.json({ ok: false, error: `Input file not found: ${inputPath}` }, { status: 400 });
    }

    const durationSec = await ffprobeDurationSeconds(inputPath);
    if (!durationSec || durationSec <= 0) {
      return NextResponse.json({ ok: false, error: "Could not read duration (ffprobe)." }, { status: 500 });
    }

    // Build a simple P1-P9 timeline around impact
    // Window: ~2.5s before impact to ~1.5s after (clamped to video)
    const start = clamp(impactSec - 2.5, 0.0, durationSec);
    const end   = clamp(impactSec + 1.5, 0.0, durationSec);

    const preEnd = clamp(impactSec - 0.10, 0.0, durationSec);
    const postStart = clamp(impactSec + 0.10, 0.0, durationSec);

    // P1..P6 spread from start..preEnd, P7 = impact, P8..P9 from postStart..end
    const pre = linspace(start, preEnd, 6);
    const post = linspace(postStart, end, 2);
    const times = [...pre, impactSec, ...post]; // total 9

    const outId = `frames_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const framesDir = `/frames/${outId}`;
    const framesAbs = path.join(process.cwd(), "public", "frames", outId);
    await fs.promises.mkdir(framesAbs, { recursive: true });

    // Extract frames
    for (let i = 0; i < 9; i++) {
      const p = i + 1;
      const t = clamp(times[i], 0.0, durationSec);

      const outJpg = path.join(framesAbs, `p${p}.jpg`);

      // -ss before -i is faster for keyframe-ish seeks; good enough here
      await run("ffmpeg", [
        "-y",
        "-ss", t.toFixed(3),
        "-i", inputPath,
        "-an",
        "-frames:v", "1",
        "-vf", "format=yuvj420p",
        "-q:v", "2",
        "-strict", "-2",
        outJpg,
      ]);
    }

    const pframes = Array.from({ length: 9 }).map((_, i) => {
      const p = i + 1;
      const img = `${framesDir}/p${p}.jpg`;
      return { p, label: `P${p}`, imageUrl: img, thumbUrl: img };
    });

    const checkpoints = Array.from({ length: 9 }).map((_, i) => {
      const p = i + 1;
      return { p, label: `P${p}`, note: "-" };
    });

    return NextResponse.json({
      ok: true,
      framesDir,
      pframes,
      checkpoints,
      topFaults: [],
      meta: {
        durationSec,
        impactSec,
        source: { localPath, videoUrl, pathname },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "extract-pframes failed" }, { status: 500 });
  } finally {
    // cleanup downloaded temp file
    try { if (tempInput) await fs.promises.unlink(tempInput); } catch {}
    try { if (tmpDir) await fs.promises.rm(tmpDir, { recursive: true, force: true }); } catch {}
  }
}


