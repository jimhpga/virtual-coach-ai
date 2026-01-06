import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
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

function exists(p: string) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function pickPowerShellExe() {
  // Prefer PS7 installed path, then pwsh, then Windows PowerShell
  const ps7 = `C:\\Program Files\\PowerShell\\7\\pwsh.exe`;
  if (exists(ps7)) return ps7;
  return "pwsh"; // might be on PATH now
}

function safeJsonFromStdout(stdout: string): any {
  // PowerShell may print extra lines; extract the last JSON object block
  const first = stdout.indexOf("{");
  const last = stdout.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("No JSON found in PowerShell output.");
  }
  const jsonText = stdout.slice(first, last + 1);
  return JSON.parse(jsonText);
}

function clampToUploads(videoUrl: string) {
  // Only allow /uploads/... under public/uploads
  if (!videoUrl || typeof videoUrl !== "string") throw new Error("videoUrl missing.");
  if (!videoUrl.startsWith("/uploads/")) throw new Error("videoUrl must start with /uploads/");

  // Build absolute file path under /public/uploads
  const rel = videoUrl.replace(/^\//, ""); // "uploads/..."
  const abs = path.join(process.cwd(), "public", rel);
  const normalized = path.normalize(abs);

  const uploadsRoot = path.normalize(path.join(process.cwd(), "public", "uploads") + path.sep);
  if (!normalized.startsWith(uploadsRoot)) {
    throw new Error("videoUrl resolved outside uploads root.");
  }
  if (!exists(normalized)) {
    throw new Error(`Video file not found on disk: ${normalized}`);
  }
  return normalized;
}

export async function POST(req: Request) {
  const started = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const videoUrl = body?.videoUrl as string;
    const impactFrame = Number(body?.impactFrame ?? 0);

    const videoAbs = clampToUploads(videoUrl);

    // job folder
    const jobId = String(Date.now());
    const framesAbs = path.join(process.cwd(), "public", "frames", jobId);
    ensureDir(framesAbs);

    // script path
    const scriptAbs = path.join(process.cwd(), "scripts", "AutoPFrames.ps1");
    if (!exists(scriptAbs)) throw new Error(`Missing script: ${scriptAbs}`);

    const psExe = pickPowerShellExe();

    // Build args
    const args = [
      "-NoLogo",
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptAbs,
      "-VideoPath",
      videoAbs,
      "-OutDir",
      framesAbs,
    ];

    if (Number.isFinite(impactFrame) && impactFrame > 0) {
      args.push("-ImpactFrame", String(impactFrame));
    }

    // Spawn PowerShell
    const child = spawn(psExe, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    // Prevent runaway memory if something goes nuts
    const MAX = 2_000_000; // 2MB
    child.stdout.on("data", (d) => {
      stdout += d.toString();
      if (stdout.length > MAX) stdout = stdout.slice(stdout.length - MAX);
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > MAX) stderr = stderr.slice(stderr.length - MAX);
    });

    // Hard timeout: kill the child and return 504
    const TIMEOUT_MS = 25_000;
    const timeout = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {}
    }, TIMEOUT_MS);

    const exitCode: number = await new Promise((resolve, reject) => {
      // If pwsh isn't found, Windows emits error event; if you don't handle it, routes can hang forever.
      child.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      child.on("close", (code) => {
        clearTimeout(timeout);
        resolve(code ?? -1);
      });
    });

    const ms = Date.now() - started;

    if (ms >= TIMEOUT_MS - 250) {
      // likely killed by timeout
      return NextResponse.json(
        {
          ok: false,
          error: `extract-pframes timed out after ${TIMEOUT_MS}ms`,
          details: { psExe, args, stderr: stderr.slice(-4000) },
        },
        { status: 504 }
      );
    }

    if (exitCode !== 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `AutoPFrames.ps1 failed (exitCode=${exitCode})`,
          details: { psExe, args, stderr: stderr.slice(-4000), stdout: stdout.slice(-2000) },
        },
        { status: 500 }
      );
    }

    const parsed = safeJsonFromStdout(stdout) as AutoPFramesResult;

    if (!parsed?.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed?.error || "AutoPFrames returned ok=false",
          details: { stderr: stderr.slice(-4000), stdout: stdout.slice(-2000) },
        },
        { status: 500 }
      );
    }

    // Build public URLs for the client/report
    const framesDir = `/frames/${jobId}`;
    const frames = (parsed.frames || []).map((f) => ({
      p: f.p,
      label: f.label,
      frame: f.frame,
      file: f.file,
      imageUrl: `${framesDir}/${f.file}`,
      thumbUrl: `${framesDir}/${f.file}`,
    }));

    // Optional sanity: if caller provided impactFrame, enforce P7==impactFrame
    if (impactFrame > 0) {
      const p7 = frames.find((x) => x.p === 7);
      if (!p7) {
        return NextResponse.json({ ok: false, error: "Missing P7 in frames output." }, { status: 500 });
      }
      // NOTE: this checks the PowerShell-reported frame index
      const p7Raw = (parsed.frames || []).find((x) => x.p === 7)?.frame;
      if (typeof p7Raw === "number" && p7Raw !== impactFrame) {
        return NextResponse.json(
          {
            ok: false,
            error: `P7 mismatch: expected impactFrame=${impactFrame}, got P7=${p7Raw}`,
            framesDir,
            frames,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      ms,
      framesDir,
      frames,
      meta: {
        fps: parsed.fps,
        nbFrames: parsed.nbFrames,
        impactFrame: parsed.impactFrame,
        window: parsed.window,
        signature: parsed.signature || null,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || String(e),
      },
      { status: 500 }
    );
  }
}
