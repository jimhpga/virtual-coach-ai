import fs from "fs";
import path from "path";

type AnyObj = Record<string, any>;

function readJsonFile(p: string) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function toFileUrl(absPath: string) {
  // Windows-safe file:// URL
  const u = new URL("file:///");
  u.pathname = absPath.replace(/\\/g, "/");
  return u.toString();
}

async function readJsonFromUrl(url: string) {
  // Supports http(s) and file://
  if (/^file:/i.test(url)) {
    const u = new URL(url);
    const filePath = decodeURIComponent(u.pathname).replace(/^\//, "");
    return readJsonFile(filePath);
  }
  const res = await fetch(url, { cache: "no-store" as any });
  if (!res.ok) throw new Error(`fetch failed ${res.status} for ${url}`);
  return await res.json();
}

function parseArgs(argv: string[]) {
  const out: AnyObj = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--src") out.src = argv[++i];
    if (a === "--out") out.out = argv[++i];
    if (a === "--baseUrl") out.baseUrl = argv[++i];
  }
  return out;
}

async function loadInput(src: string) {
  // Accept:
  // - local absolute/relative path
  // - file:// URL
  // - http(s) URL
  if (/^https?:/i.test(src) || /^file:/i.test(src)) {
    return await readJsonFromUrl(src);
  }
  // local path
  const abs = path.isAbsolute(src) ? src : path.join(process.cwd(), src);
  if (!fs.existsSync(abs)) throw new Error(`Input not found: ${abs}`);
  return readJsonFile(abs);
}

function normalizePose(rep: AnyObj) {
  // We support:
  // A) pose-only artifact: { fps, frameCount, frames, input? }
  // B) embedded: rep.pose / rep.poseJson / rep.data.pose etc.
  const embedded =
    rep.pose ??
    rep.poseJson ??
    rep.pose_data ??
    rep.poseJSON ??
    rep.data?.pose ??
    rep.data?.poseJson ??
    rep.input?.pose ??
    rep.input?.poseJson ??
    rep.payload?.pose ??
    rep.payload?.poseJson ??
    null;

  if (embedded) return embedded;

  // Pose-only artifact (your current rep_pose_*.json)
  if (Array.isArray(rep.frames) && rep.frames.length) {
    const w = rep?.input?.width ?? rep?.input?.w ?? rep?.width ?? 0;
    const h = rep?.input?.height ?? rep?.input?.h ?? rep?.height ?? 0;
    return {
      version: Number(rep.version ?? 1),
      fps: Number(rep.fps ?? 0),
      width: Number(w ?? 0),
      height: Number(h ?? 0),
      frames: rep.frames,
    };
  }

  return null;
}

async function tryImport(modPath: string) {
  // Import TS/JS modules safely from a path relative to project root.
  // Use file:// URL so Windows doesn't barf.
  const abs = path.join(process.cwd(), modPath);
  if (!fs.existsSync(abs) && !fs.existsSync(abs + ".ts") && !fs.existsSync(abs + ".mjs") && !fs.existsSync(abs + ".js")) {
    return null;
  }
  // Allow passing with extension already; otherwise try a few.
  const candidates = [abs, abs + ".ts", abs + ".mjs", abs + ".js"];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const url = toFileUrl(c);
      return await import(url);
    }
  }
  return null;
}

function pickFn(mod: AnyObj, names: string[]) {
  for (const n of names) {
    if (typeof mod?.[n] === "function") return mod[n];
  }
  return null;
}

async function analyzePose(pose: AnyObj, base: AnyObj) {
  // We try (in order):
  // 1) app/lib/analyzeFromPoseJson (preferred, richer)
  // 2) app/lib/postAssess + deterministicCoach + drills (manual assembly)
  // 3) minimal fallback: deterministicCoach only

  const a1 = await tryImport("app/lib/analyzeFromPoseJson");
  const analyzeFn =
    pickFn(a1, ["analyzeFromPoseJson", "default", "analyze", "run", "buildFromPose"]);
  if (analyzeFn) {
    return await analyzeFn({ pose, base, sourceUrl: base?.meta?.sourceUrl ?? "" });
  }

  const detMod = await tryImport("app/lib/deterministicCoach");
  const postMod = await tryImport("app/lib/postAssess");
  const drillsMod = await tryImport("app/_logic/drills");

  const deterministicCoach =
    pickFn(detMod, ["deterministicCoach", "buildDeterministicCoach", "coach", "default"]);
  const postAssess =
    pickFn(postMod, ["postAssess", "assess", "default"]);
  const pickDrillsForFaults =
    pickFn(drillsMod, ["pickDrillsForFaults", "pickDrills", "default"]);

  const baseCoach = deterministicCoach ? await deterministicCoach({ pose, base }) : (base ?? {});
  const assessed = postAssess ? await postAssess({ pose, base: baseCoach }) : {};

  const faults =
    assessed?.faults ??
    assessed?.faultKeys ??
    baseCoach?.faults ??
    baseCoach?.faultKeys ??
    baseCoach?.topFaults ??
    [];

  const drills = pickDrillsForFaults ? pickDrillsForFaults(faults) : (baseCoach?.drills ?? []);

  return {
    ...baseCoach,
    ...assessed,
    faults,
    drills,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const src = args.src;
  if (!src) throw new Error(`Missing --src`);

  const rep = await loadInput(src);
  const pose = normalizePose(rep);
  if (!pose) {
    throw new Error(`No pose found. Expected rep.frames (pose artifact) OR rep.pose/rep.poseJson.`);
  }

  const reportsDir = path.join(process.cwd(), "public", "reports");
  ensureDir(reportsDir);

  const fps = Number(rep?.fps ?? pose?.fps ?? 0);
  const framesCount = Array.isArray(pose?.frames) ? pose.frames.length : Number(rep?.frameCount ?? 0);

  const base: AnyObj = {
    version: rep?.version ?? 1,
    input: rep?.input ?? {},
    fps,
    frameCount: rep?.frameCount ?? framesCount,
    model: rep?.model ?? "",
    sampled: rep?.sampled ?? null,
    meta: {
      sourceUrl: (/^https?:/i.test(src) || /^file:/i.test(src)) ? src : "",
      builtAt: new Date().toISOString(),
      pipeline: "post-estimation-v2",
      framesCount,
    },
  };

  const out = await analyzePose(pose, base);

  // Write output
  const ts = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "_");
  const outName = `rep_post_${ts}.json`;
  const outPath = path.join(reportsDir, outName);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

  // Update latest.json (copy output)
  const latestPath = path.join(reportsDir, "latest.json");
  fs.writeFileSync(latestPath, JSON.stringify(out, null, 2), "utf8");

  const faults = out?.faults ?? out?.faultKeys ?? out?.topFaults ?? [];
  console.log("WROTE:", outPath);
  console.log("UPDATED:", latestPath);
  console.log("FPS:", fps, "FRAMES:", framesCount);
  console.log("FAULTS:", Array.isArray(faults) ? faults.join(", ") : String(faults));
}

main().catch((e: any) => {
  console.error("FAIL:", e?.message || e);
  process.exit(1);
});
