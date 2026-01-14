// pages/api/anchor-clip.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

type Body = {
  videoPath: string;
  runId?: string;
  backswingStartSec: number;
  topSec?: number;
  impactSec: number;
  postSec?: number;

  // NEW: bulletproof slow-mo handling
  minDurSec?: number;      // if (end-start) < minDurSec, expand window
  biasToStart?: number;    // 0..1 how much extra time goes to the start (default 0.75)
};

function run(cmd: string, args: string[]) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const p = spawn(cmd, args, { windowsHide: true });
    let stderr = "";
    let stdout = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.stdout.on("data", (d) => (stdout += d.toString()));
    p.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

async function getDurationSec(videoPath: string) {
  const ffprobe = "ffprobe";
  const args = ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", videoPath];
  const r = await run(ffprobe, args);
  const v = Number((r.stdout || "").trim());
  if (r.code !== 0 || !isFinite(v) || v <= 0) return null;
  return v;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });

  const body = req.body as Body;
  const {
    videoPath,
    runId = "ANCHOR_" + new Date().toISOString().replace(/[:.]/g, "-"),
    backswingStartSec,
    topSec,
    impactSec,
    postSec = 0.75,

    minDurSec = 7.0,
    biasToStart = 0.75,
  } = body;

  if (!videoPath || !fs.existsSync(videoPath)) {
    return res.status(400).json({ ok: false, error: "videoPath missing or not found", videoPath });
  }

  const dur = await getDurationSec(videoPath);

  let start = Math.max(0, Number(backswingStartSec));
  const impact = Number(impactSec);
  let end = impact + Number(postSec);

  if (!isFinite(start) || !isFinite(impact) || !isFinite(end) || end <= start) {
    return res.status(400).json({ ok: false, error: "Invalid anchors", start, impact, end });
  }

  if (topSec != null) {
    const top = Number(topSec);
    if (!(start <= top && top <= impact)) {
      return res.status(400).json({ ok: false, error: "topSec must be between start and impact", start, top, impact });
    }
  }

  // ---- BULLETPROOF EXPAND ----
  const clipLen = end - start;
  const minLen = Math.max(1, Number(minDurSec) || 0);
  const bias = Math.min(0.95, Math.max(0.05, Number(biasToStart) || 0.75));

  if (clipLen < minLen) {
    const need = minLen - clipLen;
    start = start - need * bias;
    end = end + need * (1 - bias);
  }

  // Clamp to video duration if we can
  if (dur != null) {
    start = Math.max(0, Math.min(start, Math.max(0, dur - 0.05)));
    end = Math.max(0.05, Math.min(end, dur));
    if (end <= start) {
      // last-resort safety
      end = Math.min(dur, start + Math.max(0.5, Number(postSec) || 0.75));
    }
  } else {
    start = Math.max(0, start);
    end = Math.max(start + 0.05, end);
  }

  const outDirFs = path.join(process.cwd(), "public", "clips", runId);
  fs.mkdirSync(outDirFs, { recursive: true });
  const outFileFs = path.join(outDirFs, "impact_clip.mp4");

  // Accurate trim: seek AFTER -i
  const ffmpeg = "ffmpeg";
  const args = [
    "-y",
    "-hide_banner",
    "-loglevel", "error",
    "-i", videoPath,
    "-ss", String(start),
    "-to", String(end),
    "-an",
    "-vf", "scale=1280:-2",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "20",
    "-movflags", "+faststart",
    outFileFs,
  ];

  const r = await run(ffmpeg, args);
  if (r.code !== 0) {
    return res.status(500).json({ ok: false, error: "ffmpeg failed", details: r.stderr });
  }

  return res.status(200).json({
    ok: true,
    runId,
    videoPath,
    durationSec: dur,
    backswingStartSec: start,
    topSec: topSec ?? null,
    impactSec: impact,
    postSec,
    minDurSec: minLen,
    clipUrl: `/clips/${runId}/impact_clip.mp4`,
  });
}
