import fs from "fs";
import path from "path";

type AnyObj = Record<string, any>;

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

function isHttp(s?: string | null) {
  return !!s && /^https?:\/\//i.test(s);
}

async function readJson(src: string): Promise<any> {
  if (isHttp(src)) {
    const res = await fetch(src, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${src}`);
    return await res.json();
  }
  const abs = path.isAbsolute(src) ? src : path.join(process.cwd(), src);
  if (!fs.existsSync(abs)) throw new Error(`File not found: ${abs}`);
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function stamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear().toString();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

// ---- Pose detection / extraction ----
function looksLikePoseJson(j: any) {
  return j && typeof j === "object" && Array.isArray(j.frames) && (typeof j.fps === "number" || typeof j.fps === "string");
}

function extractPose(maybe: any): AnyObj | null {
  if (looksLikePoseJson(maybe)) return maybe;

  // Common nesting patterns we’ve seen in VCA-style pipelines
  const candidates = [
    maybe?.pose,
    maybe?.poseJson,
    maybe?.pose_data,
    maybe?.data?.pose,
    maybe?.data?.poseJson,
    maybe?.rep?.pose,
    maybe?.rep?.poseJson,
    maybe?.meta?.pose,
    maybe?.meta?.poseJson,
  ];

  for (const c of candidates) {
    if (looksLikePoseJson(c)) return c;
  }
  return null;
}

// ---- Quality / confidence metrics (cheap but useful) ----
function poseQuality(pose: AnyObj | null) {
  if (!pose) {
    return { hasPose: false, frames: 0, fps: null as number | null, completeness: 0, notes: ["no pose present"] };
  }
  const frames = Array.isArray(pose.frames) ? pose.frames.length : 0;
  const fps = typeof pose.fps === "number" ? pose.fps : (Number(pose.fps) || null);

  // estimate completeness by checking landmark arrays exist
  let withLm = 0;
  let total = 0;
  for (const fr of (pose.frames || [])) {
    total++;
    if (fr && (Array.isArray(fr.lm) || Array.isArray(fr.landmarks) || Array.isArray(fr.poseLandmarks))) withLm++;
  }
  const completeness = total ? withLm / total : 0;

  const notes: string[] = [];
  if (frames < 60) notes.push("very short clip (few frames)");
  if (fps && fps < 20) notes.push("low fps");
  if (completeness < 0.85) notes.push("many frames missing landmarks");
  return { hasPose: true, frames, fps, completeness, notes };
}

// ---- Safe module import helpers (exports differ sometimes) ----
function pickExport(mod: AnyObj, names: string[]) {
  for (const n of names) {
    if (typeof mod?.[n] === "function") return mod[n];
  }
  if (typeof mod?.default === "function") return mod.default;
  return null;
}

async function main() {
  const src = arg("--src");
  if (!src) throw new Error("Missing --src");

  const outDirArg = arg("--outDir"); // optional
  const root = process.cwd();
  const reportsDir = outDirArg
    ? (path.isAbsolute(outDirArg) ? outDirArg : path.join(root, outDirArg))
    : path.join(root, "public", "reports");
  ensureDir(reportsDir);

  const input = await readJson(src);
  const pose = extractPose(input);
  const q = poseQuality(pose);

  // Import your real TS libs
  const detMod = await import("../app/lib/deterministicCoach");
  const postMod = await import("../app/lib/postAssess");
  const drillsMod = await import("../app/_logic/drills");

  const deterministicCoach = pickExport(detMod, ["deterministicCoach", "buildDeterministicCoach"]);
  const postAssess = pickExport(postMod, ["postAssess", "assessPost", "postAssessment"]);
  const pickDrillsForFaults = pickExport(drillsMod, ["pickDrillsForFaults", "drillsForFaults", "getDrillsForFaults"]);

  if (!deterministicCoach) throw new Error("Could not find deterministicCoach export in app/lib/deterministicCoach");
  if (!postAssess) throw new Error("Could not find postAssess export in app/lib/postAssess");
  if (!pickDrillsForFaults) throw new Error("Could not find pickDrillsForFaults export in app/_logic/drills");

  // Build base report (even if pose missing, deterministicCoach can still create stable defaults)
  const base = deterministicCoach({
    fps: q.fps ?? 30,
    framesCount: q.frames,
    sourceUrl: isHttp(src) ? src : `file:${src}`,
  });

  let assessed: AnyObj = {};
  let faults: any[] = [];
  let drills: any[] = [];

  if (pose) {
    assessed = postAssess({ pose, base }) || {};
    faults = assessed?.faults ?? assessed?.faultKeys ?? base?.faultKeys ?? [];
    drills = pickDrillsForFaults(faults) || [];
  } else {
    // No pose: still normalize + preserve any preexisting faults in input/base
    faults = input?.faults ?? input?.faultKeys ?? base?.faultKeys ?? [];
    drills = pickDrillsForFaults(faults) || [];
    assessed = { ...(input || {}) };
  }

  // ---- Normalize arrays to prevent UI crashes ----
  const safeArray = (v: any) => (Array.isArray(v) ? v : []);
  const out: AnyObj = {
    ...base,
    ...assessed,
    faults: safeArray(assessed?.faults ?? faults),
    drills: safeArray(drills),
    // best place to store reliability/quality:
    meta: {
      ...(base?.meta ?? {}),
      ...(assessed?.meta ?? {}),
      builtAt: new Date().toISOString(),
      pipeline: "post-estimation-v2",
      src,
      poseQuality: q,
    },
  };

  // If the input already looks like a rep_*.json, keep its identity but restamp
  // Otherwise, write a fresh canonical name
  const outName = `rep_${stamp()}.json`;
  const outPath = path.join(reportsDir, outName);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

  const latestPath = path.join(reportsDir, "latest.json");
  fs.writeFileSync(latestPath, JSON.stringify(out, null, 2), "utf8");

  console.log("✅ POST-EST OK");
  console.log("WROTE:", outPath);
  console.log("UPDATED:", latestPath);
  console.log("POSE:", JSON.stringify(q));
}

main().catch((e: any) => {
  console.error("FAIL:", e?.message || e);
  process.exit(1);
});
