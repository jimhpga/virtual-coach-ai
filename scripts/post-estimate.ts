/* eslint-disable no-console */
import fs from "fs";
import path from "path";

type AnyObj = Record<string, any>;

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
function round(n: number, d = 0) { const p = Math.pow(10, d); return Math.round(n * p) / p; }

function isUrlLike(s: string) {
  return typeof s === "string" && /^https?:\/\//i.test(s);
}

function readJsonFile(p: string) {
  const txt = fs.readFileSync(p, "utf8");
  return JSON.parse(txt);
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed ${res.status} for ${url}`);
  return await res.json();
}

/** Recursively strip any `frames` arrays from an object (deep). */
function stripFramesDeep(x: any): any {
  if (!x || typeof x !== "object") return x;
  if (Array.isArray(x)) return x.map(stripFramesDeep);
  const out: AnyObj = {};
  for (const k of Object.keys(x)) {
    if (k === "frames") continue;
    out[k] = stripFramesDeep(x[k]);
  }
  return out;
}

function labelFor(key: string) {
  const map: Record<string, string> = {
    face_open: "Clubface (open)",
    face_closed: "Clubface (closed)",
    over_the_top: "Path (over the top)",
    early_extend: "Posture (early extension)",
    late_hips: "Sequence (hips late)",
    low_turn: "Sequence (low turn)",
    arms_start_down: "Sequence (arms first)",
    flip: "Impact (flip / stall)",
    sway: "Pressure shift (sway)",
    reverse_pivot: "Pressure shift (reverse pivot)",
    foundation: "Foundation (setup + contact)",
  };
  return map[key] || (key ? key.replace(/_/g, " ") : "foundation");
}

/**
 * Build ranked faults with confidence + evidence from already-computed metrics.
 * This does NOT invent new biomechanics; it explains the metrics we already have.
 */
function buildRanked(out: AnyObj) {
  const faults: string[] = (out?.faults ?? out?.faultKeys ?? []).filter(Boolean);
  const m = out?.narrative?.metrics ?? out?.metrics ?? {};
  const okRate = typeof m.okRate === "number" ? m.okRate : 1;
  const framesUsed = typeof m.framesUsed === "number" ? m.framesUsed : (typeof out?.sampled === "number" ? out.sampled : 0);

  // Base data quality score: how trustworthy is the pose for inference?
  const quality = clamp((okRate * 100) * clamp(framesUsed / 90, 0.5, 1), 35, 98);

  // Signals (if present)
  const sepMed  = typeof m.sepMed === "number" ? m.sepMed : undefined;
  const hipTurn = typeof m.hipTurn === "number" ? m.hipTurn : undefined;
  const shTurn  = typeof m.shTurn === "number" ? m.shTurn : undefined;
  const sway    = typeof m.sway === "boolean" ? m.sway : undefined;

  // Helper: confidence from "how far past threshold" (0..100), blended with quality
  function confFromSignal(signalPct: number) {
    const s = clamp(signalPct, 0, 100);
    return Math.round(0.55 * quality + 0.45 * s);
  }

  function evidenceFor(key: string) {
    const e: string[] = [];
    if (typeof framesUsed === "number" && framesUsed) e.push(`Frames used: ${framesUsed}`);
    if (typeof okRate === "number") e.push(`Pose OK rate: ${round(okRate, 2)}`);

    if (key === "low_turn" || key === "late_hips") {
      if (sepMed != null) e.push(`Separation proxy (sepMed): ${round(sepMed, 3)}`);
      if (hipTurn != null) e.push(`Hip turn proxy: ${round(hipTurn, 3)}`);
      if (shTurn != null) e.push(`Shoulder turn proxy: ${round(shTurn, 3)}`);
      if (sepMed != null) {
        // Typical "good" separation proxy is bigger; we treat low sep as signal.
        const thr = 0.045;
        const signal = clamp(((thr - sepMed) / thr) * 100, 0, 100);
        e.push(`Signal: sepMed below ${thr} → ${Math.round(signal)}%`);
      }
      if (hipTurn != null) {
        const thr = 0.70;
        const signal = clamp(((thr - hipTurn) / thr) * 100, 0, 100);
        e.push(`Signal: hipTurn below ${thr} → ${Math.round(signal)}%`);
      }
    }

    if (key === "sway" || key === "reverse_pivot") {
      if (sway != null) e.push(`Sway flag: ${sway}`);
    }

    if (e.length === 0) e.push("Evidence: (metrics not available)");
    return e;
  }

  // Score each fault (bigger = more important). Keep it simple + deterministic.
  function scoreFor(key: string) {
    let s = 50;

    if (key === "low_turn") {
      if (sepMed != null) s += clamp(((0.045 - sepMed) / 0.045) * 80, 0, 80);
      if (hipTurn != null) s += clamp(((0.70 - hipTurn) / 0.70) * 50, 0, 50);
    }

    if (key === "late_hips") {
      if (sepMed != null) s += clamp(((0.040 - sepMed) / 0.040) * 70, 0, 70);
    }

    if (key === "sway" || key === "reverse_pivot") {
      if (sway === true) s += 60;
    }

    if (key === "foundation") s = 10;

    // Clamp and return
    return Math.round(clamp(s, 0, 100));
  }

  function confidenceFor(key: string) {
    // Default: confidence follows quality
    let signalPct = 35;

    if (key === "low_turn") {
      let sig = 0;
      if (sepMed != null) sig = Math.max(sig, clamp(((0.045 - sepMed) / 0.045) * 100, 0, 100));
      if (hipTurn != null) sig = Math.max(sig, clamp(((0.70 - hipTurn) / 0.70) * 100, 0, 100));
      signalPct = sig;
    }

    if (key === "late_hips") {
      if (sepMed != null) signalPct = clamp(((0.040 - sepMed) / 0.040) * 100, 0, 100);
    }

    if (key === "sway" || key === "reverse_pivot") {
      signalPct = sway === true ? 90 : 20;
    }

    if (key === "foundation") signalPct = 20;

    return confFromSignal(signalPct);
  }

  const ranked = faults
    .map((k) => ({
      key: k,
      label: labelFor(k),
      score: scoreFor(k),
      confidence: confidenceFor(k),
      evidence: evidenceFor(k),
    }))
    .sort((a, b) => (b.score - a.score) || (b.confidence - a.confidence));

  const topFaults = ranked.slice(0, 3).map((r) => r.key);

  return { rankedFaults: ranked, topFaults };
}

function parseArgs(argv: string[]) {
  const out: AnyObj = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--src") out.src = argv[++i];
    if (a === "--sourceUrl") out.sourceUrl = argv[++i];
  }
  return out;
}

async function loadRep(src: string) {
  if (isUrlLike(src)) return await fetchJson(src);
  // Relative path preferred. Absolute is OK here because we read via fs.
  const p = path.isAbsolute(src) ? src : path.join(process.cwd(), src);
  return readJsonFile(p);
}

/** Build a Pose object from a rep-like json that already has frames. */
function buildPoseFromRep(rep: AnyObj) {
  const frames = rep?.frames ?? rep?.input?.frames ?? [];
  const fps = rep?.fps ?? 30;
  const width = rep?.input?.width ?? (frames?.[0]?.w ?? 0);
  const height = rep?.input?.height ?? (frames?.[0]?.h ?? 0);

  return {
    version: rep?.version ?? 1,
    fps,
    width,
    height,
    frames,
  };
}

async function pickPostAssess() {
  // Try TS module first
  try {
    const mod = await import(path.join(process.cwd(), "app", "lib", "postAssess"));
    const fn = (mod as any).postAssess || (mod as any).default;
    if (typeof fn === "function") return fn;
  } catch {}
  // Try JS/compiled fallback
  try {
    const mod = await import(path.join(process.cwd(), "app", "lib", "postAssess.ts"));
    const fn = (mod as any).postAssess || (mod as any).default;
    if (typeof fn === "function") return fn;
  } catch {}
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.src) throw new Error(`Usage: npx tsx .\\scripts\\post-estimate.ts --src <rep_pose.json | url>`);

  const rep = await loadRep(String(args.src));
  const pose = buildPoseFromRep(rep);
  if (!pose?.frames?.length) throw new Error("No pose frames found (expected rep.frames).");

  const postAssessFn = await pickPostAssess();
  if (!postAssessFn) throw new Error("Could not load postAssess() from app/lib/postAssess.");

  // postAssess expects an object with pose + base (your code already follows this pattern)
  const assessed = await postAssessFn({ pose, base: rep, sourceUrl: args.sourceUrl ?? "" });

  // Merge output (rep is the base)
  const out: AnyObj = {
    ...rep,
    ...assessed,
  };

  // Ensure faults is always present
  if (!Array.isArray(out.faults) && Array.isArray(out.faultKeys)) out.faults = out.faultKeys;
  if (!Array.isArray(out.faults)) out.faults = [];

  // Add ranked faults + top faults (confidence + evidence)
  const { rankedFaults, topFaults } = buildRanked(out);
  out.rankedFaults = rankedFaults;
  out.topFaults = topFaults;

  // Make sure priority mirrors ranked #1 if we have it
  if (rankedFaults?.[0]?.key) {
    out.priorityKey = out.priorityKey ?? rankedFaults[0].key;
    out.priorityLabel = out.priorityLabel ?? rankedFaults[0].label;
  }

  // Write outputs
  const reportsDir = path.join(process.cwd(), "public", "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "").replace("Z", "Z");
  const outName = `post_${stamp}.json`;
  const outPath = path.join(reportsDir, outName);

  // FULL (but stripped) file for latest.full.json
  const latestFullPath = path.join(reportsDir, "latest.full.json");
  const latestPath = path.join(reportsDir, "latest.json");

  // Strip frames from "full" too (we want narrative + metrics, not 500k pose frames)
  const fullStripped = stripFramesDeep(out);

  // Skinny index (super small, super safe)
  const index = {
    version: fullStripped?.version ?? rep?.version ?? "v1",
    input: fullStripped?.input ?? rep?.input ?? "",
    fps: fullStripped?.fps ?? rep?.fps ?? 30,
    frameCount: fullStripped?.frameCount ?? rep?.frameCount,
    sampled: fullStripped?.sampled ?? rep?.sampled,
    model: fullStripped?.model ?? rep?.model ?? "",
    faults: fullStripped?.faults ?? fullStripped?.faultKeys ?? [],
    priorityKey: fullStripped?.priorityKey ?? fullStripped?.narrative?.priorityKey ?? "",
    priorityLabel: fullStripped?.priorityLabel ?? fullStripped?.narrative?.priorityLabel ?? "",
    scores: fullStripped?.scores ?? fullStripped?.narrative?.metrics?.scores ?? undefined,
    topFaults: fullStripped?.topFaults ?? [],
    meta: {
      ...(fullStripped?.meta ?? rep?.meta ?? {}),
      builtAt: new Date().toISOString(),
      pipeline: "post-estimation-v4",
      source: String(args.src),
    },
    urls: {
      latestFull: "/reports/latest.full.json",
      latest: "/reports/latest.json",
    },
  };

  fs.writeFileSync(outPath, JSON.stringify(fullStripped, null, 2), "utf8");
  fs.writeFileSync(latestFullPath, JSON.stringify(fullStripped, null, 2), "utf8");
  fs.writeFileSync(latestPath, JSON.stringify(index, null, 2), "utf8");

  console.log("WROTE:", outPath);
  console.log("UPDATED:", latestFullPath);
  console.log("UPDATED:", latestPath);

  const fk = Array.isArray(index.faults) ? index.faults.join(", ") : String(index.faults);
  console.log("FAULTS:", fk || "(none)");
  console.log("TOP:", Array.isArray(index.topFaults) ? index.topFaults.join(", ") : "(none)");
  if (Array.isArray(rankedFaults) && rankedFaults[0]) {
    console.log("PRIORITY:", rankedFaults[0].key, "| conf", rankedFaults[0].confidence, "| score", rankedFaults[0].score);
  }
}

main().catch((e: any) => {
  console.error("FAIL:", e?.message || e);
  process.exit(1);
});
