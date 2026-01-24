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
  fs.writeFileSync(latestPath, JSON.stringify(rep, null, 2), "utf8");

  console.log("WROTE:", outPath);
  console.log("UPDATED:", latestPath);
}

main().catch((e) => {
  console.error("FAIL:", e?.message || e);
  process.exit(1);
});
