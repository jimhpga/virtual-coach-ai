import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

function isHttp(s) { return /^https?:\/\//i.test(s || ""); }

async function readJsonFromSource(src) {
  if (!src) throw new Error("Missing --src");

  // URL fetch
  if (isHttp(src)) {
    const res = await fetch(src, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${src}`);
    return await res.json();
  }

  // Local file path (Windows ok)
  const abs = path.isAbsolute(src) ? src : path.join(process.cwd(), src);
  if (!fs.existsSync(abs)) throw new Error(`File not found: ${abs}`);
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

async function main() {
  const src = arg("--src");
  const outDirArg = arg("--outDir");

  const root = process.cwd();
  const reportsDir = outDirArg
    ? (path.isAbsolute(outDirArg) ? outDirArg : path.join(root, outDirArg))
    : path.join(root, "public", "reports");

  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const rep = await readJsonFromSource(src);

  // Canonical rep_*.json
  const ts = new Date();
  const stamp =
    ts.getFullYear().toString() +
    String(ts.getMonth() + 1).padStart(2, "0") +
    String(ts.getDate()).padStart(2, "0") +
    "_" +
    String(ts.getHours()).padStart(2, "0") +
    String(ts.getMinutes()).padStart(2, "0") +
    String(ts.getSeconds()).padStart(2, "0");

  const outName = `rep_${stamp}.json`;
  const outPath = path.join(reportsDir, outName);

  // Light meta stamp (non-breaking)
  rep.meta = {
    ...(rep.meta || {}),
    builtAt: new Date().toISOString(),
    pipeline: "post-estimation-pass-through-v1",
    source: src,
  };

  fs.writeFileSync(outPath, JSON.stringify(rep, null, 2), "utf8");

  // Update latest.json
  const latestPath = path.join(reportsDir, "latest.json");
  /* STRIP_REP_HEAVY_BEFORE_LATEST */
  try { delete rep.pose; } catch (e) {}
  try { delete rep.frames; } catch (e) {}
  /* VCA_DEMO_FAULT_FIELDS */
  // Ensure these exist for the front-end demo even if full post-assess pipeline isn't wired yet.
  try {
    const s = rep?.scores && typeof rep.scores === "object" ? rep.scores : {};
    const entries = Object.entries(s)
      .filter(([k,v]) => typeof v === "number")
      .sort((a,b) => (b[1] - a[1]));

    const top = entries.slice(0,3).map(([k,v]) => ({
      key: k,
      score: v,
      label: String(k).replace(/_/g," "),
      note: "Demo: derived from scores"
    }));

    rep.topFaults = top.map(x => x.key);
    rep.rankedFaults = top;

    // Basic confidence heuristic: higher separation between #1 and #2 => more confident
    const v1 = top?.[0]?.score ?? 0;
    const v2 = top?.[1]?.score ?? 0;
    const sep = Math.max(0, v1 - v2);
    rep.confidence = { value: Math.max(0.35, Math.min(0.95, 0.55 + sep/100)), sep };

    rep.evidence = top.map(x => ({
      faultKey: x.key,
      why: `Detected via score: ${x.score}`,
      source: "scores"
    }));
  } catch (e) {
    rep.topFaults = rep.topFaults ?? [];
    rep.rankedFaults = rep.rankedFaults ?? [];
    rep.confidence = rep.confidence ?? { value: 0.5 };
    rep.evidence = rep.evidence ?? [];
  }
    /* VCA_SAFE_FALLBACK_FAULTS */
  try {
    const needsTop = (!Array.isArray(rep.topFaults) || rep.topFaults.length === 0);
    const needsRanked = (!Array.isArray(rep.rankedFaults) || rep.rankedFaults.length === 0);

    if (needsTop || needsRanked) {
      const k1 = (rep && rep.priorityKey) ? rep.priorityKey : "clubface_control";
      const base = [k1, "low_point_control", "sequence_timing"].filter(Boolean).slice(0, 3);

      rep.topFaults = base;

      rep.rankedFaults = base.map((k, i) => ({
        key: k,
        score: 60 - i * 5,
        label: String(k).replace(/_/g, " "),
        note: "Demo fallback"
      }));
    }

    if (!rep.confidence) {
      rep.confidence = { value: 0.55, sep: 0 };
    }

    if (!Array.isArray(rep.evidence) || rep.evidence.length === 0) {
      const tf = Array.isArray(rep.topFaults) ? rep.topFaults : [];
      rep.evidence = tf.map(k => ({
        faultKey: k,
        why: "Demo fallback (scores not available)",
        source: "fallback"
      }));
    }
  } catch (e) {}fs.writeFileSync(latestPath, JSON.stringify(rep, null, 2), "utf8");

  // Also write a "full" copy for prod consumers
  const latestFullPath = path.join(reportsDir, "latest.full.json");
  fs.writeFileSync(latestFullPath, JSON.stringify(rep, null, 2), "utf8");
  console.log("WROTE:", outPath);
  console.log("UPDATED:", latestPath);
}

main().catch((e) => {
  console.error("FAIL:", e?.message || e);
  process.exit(1);
});








