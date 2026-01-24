import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

// IMPORTANT: import by module path, NOT by absolute Windows path.
import { postAssess } from "../app/lib/postAssess";

type AnyObj = Record<string, any>;

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  return undefined;
}

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

function toFileUrlIfWindowsAbs(p: string) {
  // Convert C:\... into file:///C:/...
  if (/^[a-zA-Z]:\\/.test(p)) return pathToFileURL(p).toString();
  return p;
}

async function readJson(src: string): Promise<any> {
  const s = (src || "").trim();
  if (!s) throw new Error("Missing --src");

  // URL fetch for http(s)
  if (isHttpUrl(s)) {
    const res = await fetch(s, { cache: "no-store" });
    if (!res.ok) throw new Error(`fetch failed ${res.status} for ${s}`);
    return await res.json();
  }

  // For file paths, use fs (works with C:\...).
  const p = path.isAbsolute(s) ? s : path.join(process.cwd(), s);
  if (!fs.existsSync(p)) throw new Error(`File not found: ${p}`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function buildPoseFromRep(rep: AnyObj) {
  // Your rep_pose JSON has: version, input, fps, frameCount, sampled, model, frames[]
  const frames = rep.frames ?? rep.input?.frames ?? [];
  const fps = rep.fps ?? rep.input?.fps ?? 30;
  const w = rep.input?.width ?? frames?.[0]?.w ?? 0;
  const h = rep.input?.height ?? frames?.[0]?.h ?? 0;

  return {
    version: rep.version ?? 1,
    fps,
    width: w,
    height: h,
    frames,
  };
}

function isoStamp() {
  // 20260123T052815 style
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function stripHeavy(out: AnyObj) {
  // Keep index tiny + safe for web
  return {
    version: out?.version ?? "v1",
    input: out?.input ?? "",
    fps: out?.fps ?? 30,
    frameCount: out?.frameCount ?? out?.meta?.framesCount ?? undefined,
    sampled: out?.sampled ?? undefined,
    model: out?.model ?? "",
    faults: out?.faults ?? out?.faultKeys ?? undefined,
    priorityKey: out?.priorityKey ?? out?.narrative?.priorityKey ?? undefined,
    priorityLabel: out?.priorityLabel ?? out?.narrative?.priorityLabel ?? undefined,
    scores: out?.scores ?? out?.narrative?.metrics?.scores ?? undefined,
    meta: out?.meta ?? undefined,
    urls: {
      latestFull: "/reports/latest.full.json",
      latest: "/reports/latest.json",
    },
  };
}

async function main() {
  console.log("🔥 POST-ESTIMATE REAL FILE EXECUTING 🔥");

  const src = argValue("--src");
  if (!src) throw new Error('Usage: npx tsx .\\scripts\\post-estimate.ts --src "<path-or-url>"');

  // Read rep
  const rep = await readJson(src);

  // Build pose from rep frames
  const pose = buildPoseFromRep(rep);
  if (!pose.frames || !Array.isArray(pose.frames) || pose.frames.length === 0) {
    throw new Error("No pose frames found on rep (expected rep.frames).");
  }

  // Run post-assess (v2 signature: postAssess({pose, base}))
  const assessed = postAssess({ pose, base: rep }) as AnyObj;

  // Merge output
  const out: AnyObj = {
    ...rep,
    ...assessed,
    faults: assessed?.faults ?? rep?.faults ?? rep?.faultKeys ?? [],
    meta: {
      ...(rep?.meta ?? {}),
      builtAt: new Date().toISOString(),
      pipeline: "post-estimation-v2",
      source: src,
    },
  };

  // Ensure reports dir
  const reportsDir = path.join(process.cwd(), "public", "reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  // File paths
  const ts = isoStamp();
  const outPath = path.join(reportsDir, `post_${ts}.json`);
  const latestFullPath = path.join(reportsDir, "latest.full.json");
  const latestPath = path.join(reportsDir, "latest.json");

  // Write FULL
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  fs.writeFileSync(latestFullPath, JSON.stringify(out, null, 2), "utf8");

  // Write SKINNY
  const index = stripHeavy(out);
  fs.writeFileSync(latestPath, JSON.stringify(index, null, 2), "utf8");

  const faults = (out?.faults ?? out?.faultKeys ?? []) as any[];
  console.log("WROTE:", outPath);
  console.log("UPDATED FULL:", latestFullPath);
  console.log("UPDATED INDEX:", latestPath);
  console.log("FAULTS:", Array.isArray(faults) && faults.length ? faults.join(", ") : "(none)");
}

main().catch((e: any) => {
  console.error("FAIL:", e?.message || e);
  process.exit(1);
});
