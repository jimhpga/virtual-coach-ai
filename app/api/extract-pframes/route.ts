import path from "path";
import { spawn } from "child_process";

export const runtime = "nodejs";

function runPwshAutoPFrames(videoAbs: string, outDirAbs: string) {
  return new Promise<any>((resolve, reject) => {
    const ps1 = path.join(process.cwd(), "scripts", "AutoPFrames.ps1");

    const args = [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", ps1,
      "-VideoPath", videoAbs,
      "-OutDir", outDirAbs
    ];

    const p = spawn("powershell.exe", args, { windowsHide: true });

    p.stdout.setEncoding("utf8");
    p.stderr.setEncoding("utf8");

    let out = "";
    let err = "";

    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));

    p.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(err || `powershell exited ${code}`));
      }

      // PowerShell scripts sometimes output extra lines. Extract the first JSON object.
      const raw = (out || "").trim();
      const match = raw.match(/\{[\s\S]*\}/);

      if (!match) {
        return reject(
          new Error(
            `AutoPFrames did not output JSON.\n---RAW---\n${raw.slice(0, 1200)}\n---ERR---\n${(err || "").slice(0, 1200)}`
          )
        );
      }

      try {
        resolve(JSON.parse(match[0]));
      } catch (e: any) {
        reject(
          new Error(
            `Failed to parse AutoPFrames JSON: ${e?.message || e}\n---JSON-CANDIDATE---\n${match[0].slice(0, 1200)}\n---RAW---\n${raw.slice(0, 1200)}\n---ERR---\n${(err || "").slice(0, 1200)}`
          )
        );
      }
    });
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const videoUrl = body?.videoUrl as string;
    const jobId = (body?.jobId as string) || "job";

    if (!videoUrl) return Response.json({ ok: false, error: "Missing videoUrl" }, { status: 400 });
    if (!videoUrl.startsWith("/uploads/"))
      return Response.json({ ok: false, error: "videoUrl must start with /uploads/" }, { status: 400 });

    const videoAbs = path.join(process.cwd(), "public", videoUrl);
    const outDirRel = `/frames/${jobId}`;
    const outDirAbs = path.join(process.cwd(), "public", "frames", jobId);

    const data = await runPwshAutoPFrames(videoAbs, outDirAbs);

    const frames: Record<string, string> = {};
    if (data?.ptimes) {
      for (const k of Object.keys(data.ptimes)) frames[k] = `${outDirRel}/${k.toLowerCase()}.jpg`;
    }

    return Response.json({
      ok: true,
      jobId,
      videoUrl,
      impactSec: data.impactSec,
      ptimes: data.ptimes,
      frames,
      framesDir: outDirRel
    });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "extract-pframes failed" }, { status: 500 });
  }
}
