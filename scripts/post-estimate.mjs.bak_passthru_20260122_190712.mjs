import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function nowTag() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2,"0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function readJsonFrom(src) {
  if (!src) throw new Error("Missing --src");
  if (/^https?:\/\//i.test(src)) {
    const r = await fetch(src, { cache: "no-store" });
    if (!r.ok) throw new Error(`Fetch failed ${r.status} for ${src}`);
    return await r.json();
  }
  return JSON.parse(fs.readFileSync(src, "utf8"));
}

async function main() {
  const args = process.argv.slice(2);
  const srcIdx = args.indexOf("--src");
  const src = srcIdx >= 0 ? args[srcIdx + 1] : null;

  const root = process.cwd();
  const reportsDir = path.join(root, "public", "reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  const pose = await readJsonFrom(src);

  // Dynamic import so TS/Next compilation issues don't block this script
    const analyzePath = path.join(root, "app", "lib", "analyzeFromPoseJson.mjs");
  const mod = await import(pathToFileURL(analyzePath).href);const rep = mod.analyzeFromPoseJson(pose, { sourceUrl: src ?? "" });

  const outName = `rep_${nowTag()}.json`;
  const outPath = path.join(reportsDir, outName);
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


