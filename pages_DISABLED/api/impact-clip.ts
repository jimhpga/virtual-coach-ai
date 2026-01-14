import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

function safeName(s: string) {
  return String(s || "")
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
    .slice(0, 80);
}

function probeDurationSec(videoPath: string): number {
  const out = execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    videoPath
  ]).toString().trim();
  const d = Number(out);
  return Number.isFinite(d) ? d : 0;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });

    const { videoPath, impactSec, runId, mode } = req.body || {};
    if (!videoPath) return res.status(400).json({ ok: false, error: "videoPath required" });
    const impact = Number(impactSec);
    if (!Number.isFinite(impact)) return res.status(400).json({ ok: false, error: "impactSec required (number)" });

    const dur = probeDurationSec(String(videoPath));

    // -------- AUTO MODE LOGIC --------
    // If the clip is long, we assume it’s already slow-motion playback and we:
    // 1) widen the window a lot
    // 2) do NOT slow the middle (slowFactor=1)
    const isSlowMo = (mode === "slo") || (mode !== "normal" && dur >= 6.0);

    // Normal-speed video defaults
    let leadIn   = 1.35;  // before slow zone (1x)
    let slowPre  = 0.55;  // before impact (inside slow zone)
    let slowPost = 0.25;  // after impact (inside slow zone)
    let slowFactor = 4.0; // slow only middle
    let tail     = 0.55;  // after slow zone (1x)

    // Slow-motion video defaults (wider, and no extra slow-down)
    if (isSlowMo) {
      leadIn = 3.00;      // show plenty of downswing lead-in
      slowPre = 1.25;     // include earlier downswing
      slowPost = 0.50;    // more through impact
      slowFactor = 1.0;   // DON'T slow what is already slow
      tail = 2.00;        // show follow-through
    }

    // Clamp within file
    const aStart = Math.max(0, impact - (leadIn + slowPre));
    const aEnd   = Math.max(0, impact - slowPre);

    const bStart = Math.max(0, impact - slowPre);
    const bEnd   = Math.max(0, impact + slowPost);

    const cStart = Math.max(0, impact + slowPost);
    const cEnd   = Math.max(0, impact + slowPost + tail);

    const fc =
      `[0:v]trim=start=${aStart}:end=${aEnd},setpts=PTS-STARTPTS[a];` +
      `[0:v]trim=start=${bStart}:end=${bEnd},setpts=${slowFactor}*(PTS-STARTPTS)[b];` +
      `[0:v]trim=start=${cStart}:end=${cEnd},setpts=PTS-STARTPTS[c];` +
      `[a][b][c]concat=n=3:v=1:a=0[outv]`;

    const id = safeName(runId || ("impact_" + Date.now()));
    const outDirAbs = path.join(process.cwd(), "public", "clips", id);
    fs.mkdirSync(outDirAbs, { recursive: true });

    const outFileAbs = path.join(outDirAbs, "impact_clip.mp4");

    execFileSync("ffmpeg", [
      "-y",
      "-hide_banner",
      "-loglevel", "error",
      "-i", String(videoPath),
      "-filter_complex", fc,
      "-map", "[outv]",
      "-an",
      "-movflags", "+faststart",
      outFileAbs
    ]);

    const payload = {
      ok: true,
      videoPath,
      impactSec: impact,
      durationSec: dur,
      mode: isSlowMo ? "slo" : "normal",
      clip: `/clips/${id}/impact_clip.mp4`,
      timing: { leadIn, slowPre, slowPost, slowFactor, tail },
      cuts: { aStart, aEnd, bStart, bEnd, cStart, cEnd }
    };

    fs.writeFileSync(path.join(outDirAbs, "impact_clip.json"), JSON.stringify(payload, null, 2), "utf8");
    return res.status(200).json(payload);
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "server error" });
  }
}
