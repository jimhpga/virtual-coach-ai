import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { spawn } from "child_process";

type AutoPFramesResult = {
  ok: boolean;
  signature?: string;
  videoPath: string;
  fps: number;
  nbFrames: number;
  impactFrame: number;
  window: { startFrame: number; endFrame: number; preSec: number; postSec: number };
  frames: Array<{ p: number; label: string; frame: number; file: string; path: string }>;
  error?: string;
};

function safeJson<T>(s: string): T {
  return JSON.parse(s) as T;
}

function pickPwshExe(): string {
  // Prefer PowerShell 7 if available, otherwise Windows PowerShell.
  // On Windows, "pwsh" is PS7, "powershell" is Windows PS5.x.
  return "pwsh";
}

async function runAutoPFrames(opts: {
  videoAbsPath: string;
  outDirAbsPath: string;
  impactFrame?: number;
}): Promise<AutoPFramesResult> {
  const scriptAbs = path.join(process.cwd(), "scripts", "AutoPFrames.ps1");

  if (!existsSync(scriptAbs)) {
    return {
      ok: false,
      videoPath: opts.videoAbsPath,
      fps: 0,
      nbFrames: 0,
      impactFrame: 0,
      window: { startFrame: 0, endFrame: 0, preSec: 0, postSec: 0 },
      frames: [],
      error: `AutoPFrames.ps1 not found at ${scriptAbs}`,
    };
  }

  // Try pwsh first, fall back to powershell if pwsh isn't present.
  const candidates = [pickPwshExe(), "powershell"];
  let lastErr = "";

  for (const exe of candidates) {
    const args: string[] = [
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptAbs,
      "-VideoPath",
      opts.videoAbsPath,
      "-OutDir",
      opts.outDirAbsPath,
    ];
    if (typeof opts.impactFrame === "number" && opts.impactFrame > 0) {
      args.push("-ImpactFrame", String(opts.impactFrame));
    }

    const out = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
      const p = spawn(exe, args, { windowsHide: true });

      let stdout = "";
      let stderr = "";

      p.stdout.on("data", (d) => (stdout += d.toString()));
      p.stderr.on("data", (d) => (stderr += d.toString()));

      p.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    });

    if (out.code === 0 && out.stdout.trim().startsWith("{")) {
      try {
        const parsed = safeJson<AutoPFramesResult>(out.stdout);
        return parsed;
      } catch (e: any) {
        lastErr = `Failed to parse JSON from ${exe}. Error: ${e?.message || e}. STDERR: ${out.stderr}`;
        continue;
      }
    } else {
      lastErr = `AutoPFrames failed via ${exe}. CODE=${out.code}. STDERR=${out.stderr}. STDOUT=${out.stdout}`;
      continue;
    }
  }

  return {
    ok: false,
    videoPath: opts.videoAbsPath,
    fps: 0,
    nbFrames: 0,
    impactFrame: 0,
    window: { startFrame: 0, endFrame: 0, preSec: 0, postSec: 0 },
    frames: [],
    error: lastErr || "AutoPFrames failed.",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    // Expected payload: { videoUrl: "/uploads/<file>.mp4", impactFrame?: number }
    const videoUrl = String(body?.videoUrl || "");
    const impactFrame = typeof body?.impactFrame === "number" ? body.impactFrame : undefined;

    if (!videoUrl.startsWith("/uploads/")) {
      return NextResponse.json(
        { ok: false, error: `Invalid videoUrl. Expected "/uploads/...". Got: ${videoUrl}` },
        { status: 400 }
      );
    }

    // Resolve to absolute path under public/
    const publicDir = path.join(process.cwd(), "public");
    const videoAbsPath = path.join(publicDir, videoUrl.replace(/\//g, path.sep));

    if (!existsSync(videoAbsPath)) {
      return NextResponse.json(
        { ok: false, error: `Video not found on disk: ${videoAbsPath}` },
        { status: 404 }
      );
    }

    // jobId folder: timestamp-based
    const jobId = `${Date.now()}`;
    const framesDir = `/frames/${jobId}`;
    const outDirAbsPath = path.join(publicDir, "frames", jobId);
    await fs.mkdir(outDirAbsPath, { recursive: true });

    // Run AutoPFrames (P7 == impact)
    const result = await runAutoPFrames({ videoAbsPath, outDirAbsPath, impactFrame });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || "AutoPFrames failed.", debug: { framesDir, outDirAbsPath } },
        { status: 500 }
      );
    }

    // Convert to urls
    const frames = result.frames || [];
    const pframes = frames.map((f) => ({
      p: f.p,
      label: f.label,
      frame: f.frame,
      imageUrl: `${framesDir}/${f.file}`,
      thumbUrl: `${framesDir}/${f.file}`,
    }));

    // HARD GUARANTEE
    const p7 = pframes.find((x) => x.p === 7);
    if (!p7 || p7.frame !== result.impactFrame) {
      return NextResponse.json(
        {
          ok: false,
          error: "P7 sanity check failed: P7.frame did not equal impactFrame.",
          debug: { impactFrame: result.impactFrame, p7 },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      jobId,
      videoUrl,
      framesDir,
      signature: result.signature || "",
      impactFrame: result.impactFrame,
      window: result.window,
      frames: pframes, // backward compat
      pframes, // explicit
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "extract-pframes error" },
      { status: 500 }
    );
  }
}
