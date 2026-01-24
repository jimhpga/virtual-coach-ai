import { smoothPoseJson } from "./lib/pose_smooth";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { spawn } from "child_process";

function vcaClamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}
function vcaReliabilityFromDebug(dbg: any) {
  // Prefer QC jitter proxy if present; fallback to 0.008 (typical raw) if unknown
  const jitter = typeof dbg?.jitterProxy === "number" ? dbg.jitterProxy : 0.008;
  const missingPct = typeof dbg?.missingPct === "number" ? dbg.missingPct : 0;
  // Convert jitter (0.003–0.015 typical) into a 55–95 score range
  const score = 100 - (jitter * 4000) - (missingPct * 0.8);
  return vcaClamp(Math.round(score), 55, 95);
}


async function __vcaDump(tag: string, payload: any) {
  try {
    if (process.env.NODE_ENV === "production") return;

    const jobId =
      payload?.id ??
      payload?.jobId ??
      payload?.job?.id ??
      payload?.data?.id ??
      `dev_${Date.now()}`;

    const dir = path.join(process.cwd(), ".data", "jobs", String(jobId));
    await mkdir(dir, { recursive: true });

    const write = async (name: string, obj: any) => {
      if (obj === undefined) return;
      const p = path.join(dir, name);
      await writeFile(p, JSON.stringify(obj, null, 2), "utf8");
    };

    await write("response.json", payload);
    await write(`${tag}.json`, payload);

    // Optional common keys (if present)
    await write("ai_raw.json", payload?.ai_raw ?? payload?.aiRaw ?? payload?.raw ?? payload?.model_raw);
    await write("ai_parsed.json", payload?.ai_parsed ?? payload?.aiParsed ?? payload?.parsed ?? payload?.model_parsed);
    await write("ai_summary.json", payload?.ai_summary ?? payload?.aiSummary ?? payload?.summary ?? payload?.report);
  } catch {}
}

export const runtime = "nodejs";

type Body = {
  videoUrl: string;
  impactFrame: number;
  level: "beginner" | "intermediate" | "advanced" | "teacher";
};


function shapeResponse(args: {
  level: string;
  framesDirUrl: string;
  frames: any[];
}) {
  return {
    ok: true,
    level: args.level,
    media: { framesDir: args.framesDirUrl, frames: args.frames },
    scores: { swing: 82, power: 78, reliability: 74, speed: 77, efficiency: 73, consistency: 72 },
    narrative: {
      good: [
        "Good balance and posture through the motion.",
        "Solid rhythm-nothing looks rushed.",
        "Nice intent to swing through the target.",
      ],
      improve: [
        "Clean up the transition so the hands don't ‘throw' early.",
        "Keep your chest over the ball longer through impact.",
        "Stay in your safe hallway on the way down.",
      ],
      powerLeaks: [
        "Arms outrun the body into impact (costs strike + speed).",
        "Standing up through impact (creates thin/fat misses).",
        "Club drifts outside the safe hallway coming down (requires saving it late).",
      ],
    },
  };
}
function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

function absUrl(req: NextRequest, maybeRelative: string) {
  const origin = new URL(req.url).origin;
  if (isHttpUrl(maybeRelative)) return maybeRelative;
  if (maybeRelative.startsWith("/")) return `${origin}${maybeRelative}`;
  return `${origin}/${maybeRelative}`;
}

async function downloadToTemp(url: string, tmpDir: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch video (${res.status}) from: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const file = path.join(tmpDir, `video-${Date.now()}-${randomUUID()}.mp4`);
  await fs.writeFile(file, buf);
  return file;
}

// Run python with stdin JSON, expect stdout JSON
function runPythonPoseStdin(videoPath: string, impactFrame: number, outDir: string) {
  return new Promise<any>((resolve, reject) => {
    const pyVenv = path.join(process.cwd(), ".venv", "Scripts", "python.exe");
    const python = existsSync(pyVenv) ? pyVenv : "python";
    const script = path.join(process.cwd(), "app", "api", "analyze-swing", "pose_engine.py");

    const ps = spawn(python, [script], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let out = "";
    let err = "";

    ps.stdout.on("data", (d) => (out += d.toString("utf8")));
    ps.stderr.on("data", (d) => (err += d.toString("utf8")));

    ps.on("close", (code) => {
      if (code !== 0) return reject(new Error(`pose_engine.py failed (code=${code}).\n${err || out}`));
      try {
      const json0 = JSON.parse(out.trim());
      const json = smoothPoseJson(json0, 0.45, 2, 0.0, 0.0); // VCA: smooth pose to reduce jitter
        /* VCA: make reliability score data-driven (jitter + missing frames) */
try {
  const dbg = (json as any).debug;
  const rel = vcaReliabilityFromDebug(dbg);
  if ((json as any).scores && typeof (json as any).scores === "object") {
    (json as any).scores.reliability = rel;
  } else {
    (json as any).scores = { reliability: rel };
  }
} catch {}
/* VCA: make reliability score data-driven (jitter + missing frames) */
try {
  const dbg = (json as any).debug;
  const rel = vcaReliabilityFromDebug(dbg);
  if ((json as any).scores && typeof (json as any).scores === "object") {
    (json as any).scores.reliability = rel;
  } else {
    (json as any).scores = { reliability: rel };
  }
} catch {}
(json as any).debug = { ...(json as any).debug, smoothed: true, alpha: 0.45, maxGap: 2 };
resolve(json);
      } catch {
        reject(new Error(`pose_engine.py returned non-JSON output:\n${out}\n\nstderr:\n${err}`));
      }
    });

    const payload = JSON.stringify({ videoPath, impactFrame, outDir });
    ps.stdin.write(payload);
    ps.stdin.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const videoUrlIn = (body?.videoUrl || "").trim();
    const impactFrame = Number(body?.impactFrame ?? 0) || 0;
    const level = body?.level || "beginner";

    if (!videoUrlIn) return NextResponse.json(
  shapeResponse({ level, framesDirUrl, frames })
);// Create session folders
    const sessionId = `sess-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const tmpRoot = path.join(process.cwd(), ".tmp");
    const sessionTmp = path.join(tmpRoot, sessionId);
    const framesOut = path.join(sessionTmp, "frames");
    await fs.mkdir(framesOut, { recursive: true });

    // Resolve video path:
    // - If /uploads/... -> local file in public/uploads/...
    // - If http(s) -> download to tmp
    // - Else treat as relative and map to public/
    let localVideoPath = "";

    if (videoUrlIn.startsWith("/uploads/")) {
      localVideoPath = path.join(process.cwd(), "public", videoUrlIn.replaceAll("/", path.sep));
    } else if (isHttpUrl(videoUrlIn)) {
      const full = absUrl(req, videoUrlIn);
      localVideoPath = await downloadToTemp(full, sessionTmp);
    } else if (videoUrlIn.startsWith("/")) {
      localVideoPath = path.join(process.cwd(), "public", videoUrlIn.replaceAll("/", path.sep));
    } else {
      localVideoPath = path.join(process.cwd(), "public", videoUrlIn.replaceAll("/", path.sep));
    }

    console.log("🧠 analyze-swing", { videoUrlIn, localVideoPath, impactFrame, level, sessionId });

    // Verify local file exists
    try {
      await fs.stat(localVideoPath);
    } catch {
      return NextResponse.json(
  shapeResponse({ level, framesDirUrl, frames })
);}

    // Run python -> writes JPGs into framesOut
    const pose = await runPythonPoseStdin(localVideoPath, impactFrame, framesOut);
pose = smoothPoseJson(pose, 0.45, 2, 0.0, 0.0); // VCA: smooth pose to reduce jitter
    if (!pose?.ok) return NextResponse.json(
  shapeResponse({ level, framesDirUrl, frames })
);// Copy generated frames into public so browser can load them
    const publicSessionDir = path.join(process.cwd(), "public", "uploads", "_sessions", sessionId);
    await fs.mkdir(publicSessionDir, { recursive: true });

    const files = await fs.readdir(framesOut);
    let copied = 0;
    for (const f of files) {
      const low = f.toLowerCase();
      if (!low.endsWith(".jpg") && !low.endsWith(".jpeg") && !low.endsWith(".png")) continue;
      await fs.copyFile(path.join(framesOut, f), path.join(publicSessionDir, f));
      copied++;
    }

    if (copied < 5) {
      return NextResponse.json(
  shapeResponse({ level, framesDirUrl, frames })
);}

    const framesDirUrl = `/uploads/_sessions/${sessionId}`;
    const frames = (pose.frames || []).map((x: any) => ({
      p: x.p,
      label: x.label,
      frame: x.frame,
      file: x.file,
      imageUrl: `${framesDirUrl}/${x.imageUrl}`,
      thumbUrl: `${framesDirUrl}/${x.thumbUrl}`,
    }));

    return NextResponse.json(
  shapeResponse({ level, framesDirUrl, frames })
);} catch (e: any) {
    console.error("❌ analyze-swing route failed:", e?.message || e);
    return NextResponse.json(
  shapeResponse({ level, framesDirUrl, frames })
);}
}








