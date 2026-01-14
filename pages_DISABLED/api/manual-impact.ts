import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

function safeName(s: string) {
  return s.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 80);
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });

  const { videoPath, impactSec, runId } = req.body || {};
  if (!videoPath || typeof videoPath !== "string") return res.status(400).json({ ok: false, error: "videoPath required" });
  if (impactSec === undefined || impactSec === null || Number.isNaN(Number(impactSec))) {
    return res.status(400).json({ ok: false, error: "impactSec required (number)" });
  }

  const impact = Number(impactSec);
  const id = safeName(runId || ("manual_" + Date.now()));
  const outDir = path.join(process.cwd(), "public", "frames", id);
  fs.mkdirSync(outDir, { recursive: true });

  const payload = {
    ok: true,
    videoPath,
    impactSec: impact,
    impactSource: "manual",
    createdAt: new Date().toISOString(),
    outDir: `/frames/${id}`
  };

  fs.writeFileSync(path.join(outDir, "impact.json"), JSON.stringify(payload, null, 2), "utf8");

  // 9 frames around impact: -0.85s to +0.25s
  const winStart = Math.max(0, impact - 0.85);
  const winEnd = impact + 0.25;
  const winLen = Math.max(0.01, winEnd - winStart);
  const step = winLen / 8.0;

  // Use ffmpeg from PATH (works with your current setup)
  for (let i = 0; i < 9; i++) {
    const t = winStart + step * i;
    const outFile = path.join(outDir, `p${i + 1}.jpg`);
    execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", videoPath, "-ss", String(t), "-frames:v", "1", "-q:v", "2", outFile]);
  }

  return res.status(200).json(payload);
}

