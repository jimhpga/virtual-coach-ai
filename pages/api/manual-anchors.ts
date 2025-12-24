import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

function safeName(s: string) {
  return String(s || "").replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 80);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });

  const { videoPath, runId, tStart, tDown, tImpact } = req.body || {};
  if (!videoPath) return res.status(400).json({ ok: false, error: "videoPath required" });

  const start = Number(tStart);
  const down  = tDown === null || tDown === undefined || tDown === "" ? NaN : Number(tDown);
  const impact = Number(tImpact);

  if (!Number.isFinite(start)) return res.status(400).json({ ok: false, error: "tStart required (number)" });
  if (!Number.isFinite(impact)) return res.status(400).json({ ok: false, error: "tImpact required (number)" });

  const id = safeName(runId || ("anchors_" + Date.now()));
  const outDir = path.join(process.cwd(), "public", "frames", id);
  fs.mkdirSync(outDir, { recursive: true });

  // Use anchors to define the window
  const winStart = clamp(start, 0, impact);
  const winEnd = Math.max(winStart + 0.05, impact);

  // frames: 9 evenly spaced from winStart -> winEnd
  const len = Math.max(0.05, winEnd - winStart);
  const step = len / 8.0;

  // clip: prefer downswing->afterImpact if downswing provided; else impact-centered
  const clipStart = Number.isFinite(down) ? clamp(down, 0, impact) : Math.max(0, impact - 1.25);
  const clipEnd = impact + 0.55;

  const clipDir = path.join(process.cwd(), "public", "clips", id);
  fs.mkdirSync(clipDir, { recursive: true });
  const clipPath = path.join(clipDir, "impact_clip.mp4");

  // Write anchors.json
  const meta = {
    ok: true,
    videoPath,
    anchors: { tStart: winStart, tDown: Number.isFinite(down) ? down : null, tImpact: impact },
    window: { start: winStart, end: winEnd },
    clip: { start: clipStart, end: clipEnd },
    outDir: `/frames/${id}`,
    clipUrl: `/clips/${id}/impact_clip.mp4`,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, "anchors.json"), JSON.stringify(meta, null, 2), "utf8");

  // Generate 9 frames (accurate seek: -ss after -i)
  for (let i = 0; i < 9; i++) {
    const t = winStart + step * i;
    const outFile = path.join(outDir, `p${i + 1}.jpg`);
    execFileSync("ffmpeg", ["-y","-hide_banner","-loglevel","error","-i", videoPath, "-ss", String(t), "-frames:v","1","-q:v","2", outFile]);
  }

  // Generate clip
  const clipLen = Math.max(0.2, clipEnd - clipStart);
  execFileSync("ffmpeg", ["-y","-hide_banner","-loglevel","error","-i", videoPath, "-ss", String(clipStart), "-t", String(clipLen),
    "-vf","scale=1280:-2","-c:v","libx264","-preset","veryfast","-crf","20","-pix_fmt","yuv420p","-an", clipPath]);

  return res.status(200).json(meta);
}
