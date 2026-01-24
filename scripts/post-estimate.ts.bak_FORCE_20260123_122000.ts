import fs from "fs";
import path from "path";

// Post-estimation pipeline runner (Node)
// - Reads rep JSON (rep_pose_*.json)
// - Runs postAssess (deterministic, local)
// - Writes:
//   1) public/reports/latest.full.json  (full coaching payload, frames removed)
//   2) public/reports/latest.json       (skinny index pointer)
//   3) public/reports/post_*.json       (archived full payload, frames removed)

type AnyObj = Record<string, any>;

function parseArgs() {
  const args = process.argv.slice(2);
  const out: AnyObj = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--src") out.src = args[++i];
    else if (a === "--out") out.out = args[++i];
  }
  return out;
}

function readJson(p: string) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function stripHeavy(x: any): any {
  if (!x || typeof x !== "object") return x;
  // Deep clone + delete frames-like fields
  const j = JSON.parse(JSON.stringify(x));

  // Common heavy fields
  delete j.frames;
  delete j.pose;
  delete j.poseJson;

  // Nested heavy fields sometimes appear under input/data
  if (j.input && typeof j.input === "object") {
    delete j.input.frames;
    delete j.input.pose;
    delete j.input.poseJson;
  }
  if (j.data && typeof j.data === "object") {
    delete j.data.frames;
    delete j.data.pose;
    delete j.data.poseJson;
  }

  return j;
}

async function safeImportPostAssess() {
  // Works whether postAssess is TS/JS and whether it exports default/named
  const mod = await import(path.join(process.cwd(), "app", "lib", "postAssess"));
  const postAssess =
    (mod as any).postAssess ||
    (mod as any).default?.postAssess ||
    (mod as any).default ||
    null;

  if (typeof postAssess !== "function") {
    throw new Error("Could not load postAssess() from app/lib/postAssess");
  }
  return postAssess as (rep: any) => any;
}

function buildIndex(out: any, rep: any) {
  const faults = out?.faults ?? out?.faultKeys ?? rep?.faults ?? rep?.faultKeys ?? [];
  const priorityKey = out?.priorityKey ?? out?.narrative?.priorityKey ?? out?.priority ?? undefined;
  const priorityLabel = out?.priorityLabel ?? out?.narrative?.priorityLabel ?? undefined;
  const scores = out?.scores ?? out?.narrative?.metrics?.scores ?? undefined;

  return {
    version: out?.version ?? rep?.version ?? "v1",
    input: out?.input ?? rep?.input ?? "",
    fps: out?.fps ?? rep?.fps ?? 30,
    frameCount: out?.frameCount ?? rep?.frameCount,
    sampled: out?.sampled ?? rep?.sampled,
    model: out?.model ?? rep?.model ?? "",
    faults: Array.isArray(faults) ? faults : [],
    priorityKey,
    priorityLabel,
    scores,
    meta: {
      ...(out?.meta ?? rep?.meta ?? {}),
      builtAt: new Date().toISOString(),
      pipeline: "post-estimation-v2",
      source: rep?.meta?.source ?? "",
    },
    urls: {
      latestFull: "/reports/latest.full.json",
    },
  };
}

async function main() {
  const opts = parseArgs();
  const src = String(opts.src || "").trim();
  if (!src) throw new Error('Missing --src "path/to/rep_pose_*.json"');

  const absSrc = path.isAbsolute(src) ? src : path.join(process.cwd(), src);
  if (!fs.existsSync(absSrc)) throw new Error("Source not found: " + absSrc);

  const rep = readJson(absSrc);

  // NOTE: rep_pose_*.json contains frames at top-level (your current format)
  // postAssess expects something like AnalyzeResponse-ish. We'll pass the whole rep.
  const postAssess = await safeImportPostAssess();

  // Run post assessment (returns narrative bits + faults/metrics if implemented)
  const assessed = postAssess(rep) || {};

  // Merge: keep rep header fields, then assessed additions
  const outFull = {
    ...rep,
    ...assessed,
    meta: {
      ...(rep?.meta ?? {}),
      ...(assessed?.meta ?? {}),
      builtAt: new Date().toISOString(),
      pipeline: "post-estimation-v2",
      source: absSrc,
    },
  };

  // Strip heavy payload for writing (no frames in outputs)
  const out = stripHeavy(outFull);

  const reportsDir = path.join(process.cwd(), "public", "reports");
  ensureDir(reportsDir);

  const ts = new Date().toISOString().replace(/[:.]/g, "").replace("Z", "Z");
  const outPath = opts.out
    ? (path.isAbsolute(String(opts.out)) ? String(opts.out) : path.join(process.cwd(), String(opts.out)))
    : path.join(reportsDir, `post_${ts}.json`);

  const latestFullPath = path.join(reportsDir, "latest.full.json");
  const latestPath = path.join(reportsDir, "latest.json");

  // Write archive + latest.full + latest index
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  fs.writeFileSync(latestFullPath, JSON.stringify(out, null, 2), "utf8");

  const index = buildIndex(out, rep);
  fs.writeFileSync(latestPath, JSON.stringify(index, null, 2), "utf8");

  const faults = index?.faults ?? [];
  console.log("WROTE:", outPath);
  console.log("UPDATED:", latestPath);
  console.log("UPDATED:", latestFullPath);
  console.log("FAULTS:", Array.isArray(faults) && faults.length ? faults.join(", ") : "(none)");
}

main().catch((e: any) => {
  console.error("FAIL:", e?.message || e);
  process.exit(1);
});
