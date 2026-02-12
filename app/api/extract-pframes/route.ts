import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

type Body = {
  videoUrl?: string;
  posePath?: string;
  timesSec?: number[];
  impactSec?: number;
};

function clamp(x: number, lo: number, hi: number) {
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

function linspace(a: number, b: number, n: number) {
  if (n <= 1) return [a];
  const out: number[] = [];
  const step = (b - a) / (n - 1);
  for (let i = 0; i < n; i++) out.push(a + step * i);
  return out;
}

function run(cmd: string, args: string[], cwd?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, windowsHide: true });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d.toString()));
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

async function ffprobeDurationSec(inputPath: string): Promise<number> {
  const args = [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    inputPath,
  ];
  const r = await run("ffprobe", args);
  const raw = (r.stdout || "").trim();
  const v = Number(raw);
  if (r.code === 0 && Number.isFinite(v) && v > 0) return v;
  return NaN;
}

function resolveLocalInputPath(videoUrl: string): { inputPath: string | null; source: any } {
  // Supported: "/uploads/<file>" (served from public/uploads)
  // Also allow absolute local path (advanced use)
  const source: any = { localPath: null, videoUrl: videoUrl || null, pathname: null };

  if (!videoUrl || typeof videoUrl !== "string") return { inputPath: null, source };

  if (videoUrl.startsWith("/uploads/")) {
    const base = path.basename(videoUrl);
    const inputPath = path.join(process.cwd(), "public", "uploads", base);
    source.videoUrl = videoUrl;
    return { inputPath, source };
  }

  // Allow a raw local path if user passes one
  if (videoUrl.match(/^[A-Za-z]:\\/) || videoUrl.startsWith("\\\\")) {
    source.localPath = videoUrl;
    return { inputPath: videoUrl, source };
  }

  // Anything else is unsupported in this clean version
  return { inputPath: null, source };
}

function vcaTryLoadPoseFile(posePath: string): { fps: number; frames: any[] } | null {
  try {
    if (!posePath || typeof posePath !== "string") return null;
    if (!fs.existsSync(posePath)) return null;
    const raw = fs.readFileSync(posePath, "utf8");
    const j = JSON.parse(raw);
    const fps = Number(j?.fps ?? 30);
    const frames = Array.isArray(j?.frames) ? j.frames : [];
    if (!Number.isFinite(fps) || fps <= 0) return null;
    if (!Array.isArray(frames) || frames.length === 0) return null;
    return { fps, frames };
  } catch {
    return null;
  }
}

function vcaPickP10FromPoseFrames(frames: any[]): number[] {
  // We expect frames already sampled, and we want 10 indices across the motion.
  // Use OK frames if present; else just use all frames.
  const all = Array.isArray(frames) ? frames : [];
  const ok = all.filter((f) => f && f.ok && Array.isArray(f.landmarks) && f.landmarks.length > 0);
  const use = ok.length >= 10 ? ok : all;
  const n = use.length;
  if (n < 10) return [];
  const idxs = linspace(0, n - 1, 10).map((x) => Math.round(x));
  return idxs.map((i) => clamp(i, 0, n - 1) as any) as unknown as number[];
}

function vcaSecFromPoseFrame(poseFrame: any, fps: number): number {
  // Prefer poseFrame.t if valid, else frame/fps, else 0.
  const t = Number(poseFrame?.t);
  if (Number.isFinite(t) && t >= 0) return t;
  const fr = Number(poseFrame?.frame);
  const fpsSafe = Number(fps);
  if (Number.isFinite(fr) && fr >= 0 && Number.isFinite(fpsSafe) && fpsSafe > 0) return fr / fpsSafe;
  return 0;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const videoUrl = typeof body.videoUrl === "string" ? body.videoUrl : "";
    const posePath = typeof body.posePath === "string" ? body.posePath : null;
    const impact = (typeof body.impactSec === "number" && body.impactSec > 0) ? body.impactSec : 2.0;

    const resolved = resolveLocalInputPath(videoUrl);
    const inputPath = resolved.inputPath;
    const source = resolved.source;

    if (!inputPath || !fs.existsSync(inputPath)) {
      return NextResponse.json({ ok: false, error: `Input file not found: ${inputPath ?? "(null)"}` }, { status: 400 });
    }

    const durationRaw = await ffprobeDurationSec(inputPath);
    const durationSec = Number(durationRaw);

    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      return NextResponse.json({ ok: false, error: "Could not read duration (ffprobe).", debug: { inputPath } }, { status: 500 });
    }

    // Build times: prefer posePath -> timesSec[10] -> fallback window around impact
    let times: number[] = [];

    let usedPosePath = false;
    let usedExplicitTimes = false;

    if (posePath) {
      const pose = vcaTryLoadPoseFile(posePath);
      if (pose?.frames?.length) {
        const idxs = vcaPickP10FromPoseFrames(pose.frames);
        if (idxs.length === 10) {
          usedPosePath = true;
          times = idxs.map((idx) => {
            const f = pose.frames[idx];
            return vcaSecFromPoseFrame(f, pose.fps);
          });
        }
      }
    }

    if (times.length !== 10 && Array.isArray(body.timesSec) && body.timesSec.length === 10) {
      usedExplicitTimes = true;
      times = body.timesSec.map((x) => Number(x));
    }

    if (times.length !== 10) {
      // Fallback: 2.5s before to 1.5s after impact, mapped to P1..P10
      const start = clamp(impact - 2.5, 0.0, durationSec);
      const end = clamp(impact + 1.5, 0.0, durationSec);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return NextResponse.json({ ok: false, error: "Invalid timing window (start/end)." }, { status: 500 });
      }
      times = linspace(start, end, 10);
    }

    // --- SANITIZE times for ffmpeg (-ss must never be NaN) ---
    let timesSafe: number[] = Array.isArray(times) ? times.slice(0, 10) : [];
    let sanitized = false;
    try {
      if (timesSafe.length !== 10 || timesSafe.some((t: any) => !Number.isFinite(Number(t)))) {
        sanitized = true;
        timesSafe = linspace(0.0, durationSec, 10);
      }
      timesSafe = timesSafe.map((t: any) => clamp(Number(t), 0.0, durationSec));
    } catch {
      sanitized = true;
      timesSafe = linspace(0.0, durationSec, 10).map((t: any) => clamp(Number(t), 0.0, durationSec));
    }
    // --- END SANITIZE ---

    const baseName = path.basename(inputPath).replace(/[^\w.\-]+/g, "_");
    const timesTag = usedPosePath ? "_P" : (usedExplicitTimes ? "_T" : "");
    const cacheKey = `v2P10_${baseName}_imp${impact.toFixed(2).replace(".", "p")}${timesTag}`;

    const framesDir = `/frames/${cacheKey}`;
    const framesAbs = path.join(process.cwd(), "public", "frames", cacheKey);

    // Cached fast-path
    if (fs.existsSync(path.join(framesAbs, "p1.jpg"))) {
      const pframes = Array.from({ length: 10 }).map((_, i) => {
        const p = i + 1;
        const img = `${framesDir}/p${p}.jpg`;
        return { p, label: `P${p}`, imageUrl: img, thumbUrl: img };
      });
      const checkpoints = Array.from({ length: 10 }).map((_, i) => {
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
          impactSec: impact,
          source,
          cached: true,
          usedPosePath,
          usedExplicitTimes,
          sanitizedTimes: sanitized,
        },
      });
    }

    await fs.promises.mkdir(framesAbs, { recursive: true });

    // Extract frames
    for (let i = 0; i < 10; i++) {
      const p = i + 1;
      const t = clamp(timesSafe[i], 0.0, durationSec);
      const outJpg = path.join(framesAbs, `p${p}.jpg`);

      const r = await run("ffmpeg", [
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

      if (r.code !== 0) {
        return NextResponse.json({
          ok: false,
          error: (r.stderr || r.stdout || "ffmpeg failed").toString(),
          debug: { i, p, t, inputPath, outJpg },
        }, { status: 500 });
      }
    }

    const pframes = Array.from({ length: 10 }).map((_, i) => {
      const p = i + 1;
      const img = `${framesDir}/p${p}.jpg`;
      return { p, label: `P${p}`, imageUrl: img, thumbUrl: img };
    });

    const checkpoints = Array.from({ length: 10 }).map((_, i) => {
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
        impactSec: impact,
        source,
        cached: false,
        usedPosePath,
        usedExplicitTimes,
        sanitizedTimes: sanitized,
      },
    });

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "extract-pframes failed" }, { status: 500 });
  }
}
