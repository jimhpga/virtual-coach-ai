import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

type AnyObj = Record<string, any>;

function arg(name: string): string {
  const ix = process.argv.indexOf(name);
  if (ix >= 0 && process.argv[ix + 1]) return process.argv[ix + 1];
  return "";
}

function nowStamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function toFileUrlIfAbs(p: string) {
  // tsx/esbuild on Windows is fine with direct fs reads, but dynamic import wants file://
  if (!p) return "";
  if (/^(file|https?|data|node):/i.test(p)) return p;
  if (path.isAbsolute(p)) return pathToFileURL(p).toString();
  return p;
}

function readJson(p: string) {
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function pickExport(mod: AnyObj, names: string[], hintRegex?: RegExp) {
  for (const n of names) {
    if (typeof (mod as any)?.[n] === "function") return (mod as any)[n];
  }
  if (typeof (mod as any)?.default === "function") return (mod as any).default;

  const fns = Object.entries(mod || {}).filter(([, v]) => typeof v === "function") as Array<[string, Function]>;
  if (fns.length === 1) return fns[0][1];

  if (hintRegex && fns.length) {
    const hit = fns.find(([k]) => hintRegex.test(k));
    if (hit) return hit[1];
  }

  const preference = /(deterministic|coach|base|report|build|make|post|assess|drill|fault)/i;
  const hit2 = fns.find(([k]) => preference.test(k));
  if (hit2) return hit2[1];

  return null;
}

async function main() {
  const src = arg("--src");
  if (!src) throw new Error('Missing --src "path\\to\\rep_pose.json"');

  if (!fs.existsSync(src)) throw new Error(`File not found: ${src}`);

  // Load pose report JSON
  const rep = readJson(src);

  // We expect either rep.pose OR rep.poseUrl OR rep.poseJson style payload.
  // Your current rep_pose file should already include pose frames; if not, we can expand later.
  const pose = rep.pose ?? rep.poseJson ?? rep.pose_data ?? null;
  if (!pose) {
    // Allow "poseUrl" to be embedded (local or remote), but keep simple for now:
    const poseUrl = rep.poseUrl || rep.pose_url || "";
    if (!poseUrl) throw new Error("No pose data found on rep (expected rep.pose or rep.poseJson).");
    throw new Error("rep.poseUrl present but runner currently expects embedded pose. (Next patch can fetch it.)");
  }

  // Dynamic import internal libs (so this script stays standalone)
  const detUrl   = toFileUrlIfAbs(path.join(process.cwd(), "app", "lib", "deterministicCoach"));
  const postUrl  = toFileUrlIfAbs(path.join(process.cwd(), "app", "lib", "postAssess"));
  const drillsUrl= toFileUrlIfAbs(path.join(process.cwd(), "app", "_logic", "drills"));

  const detMod    = await import(detUrl);
  const postMod   = await import(postUrl);
  const drillsMod = await import(drillsUrl);

  const deterministicCoach = pickExport(
    detMod as AnyObj,
    ["deterministicCoach","buildDeterministicCoach","buildBase","buildBaseReport","makeBase","makeBaseReport"],
    /(deterministic|coach|base|report)/i
  );
  if (!deterministicCoach) {
    console.error("deterministicCoach exports:", Object.keys(detMod || {}));
    throw new Error("Could not find deterministicCoach export in app/lib/deterministicCoach");
  }

  const postAssess = pickExport(
    postMod as AnyObj,
    ["postAssess","assessPost","postAssessment","assess","analyze","post"],
    /(post|assess|analy)/i
  );
  if (!postAssess) {
    console.error("postAssess exports:", Object.keys(postMod || {}));
    throw new Error("Could not find postAssess export in app/lib/postAssess");
  }

  const pickDrillsForFaults = pickExport(
    drillsMod as AnyObj,
    ["pickDrillsForFaults","drillsForFaults","getDrillsForFaults","pickDrills","drillsFor","faultDrills"],
    /(drill|fault)/i
  );
  if (!pickDrillsForFaults) {
    console.error("drills exports:", Object.keys(drillsMod || {}));
    throw new Error("Could not find pickDrillsForFaults export in app/_logic/drills");
  }

  // 1) Build deterministic base report (stable schema)
  const base = deterministicCoach({ pose }) ?? {};

  // 2) Post assessment (faults + derived metrics)
  const assessed = postAssess({ pose, base }) ?? {};

  // 3) Fault list (normalize)
  const faults = (assessed.faults ?? assessed.faultKeys ?? base.faultKeys ?? base.faults ?? []) as any[];
  const drills = pickDrillsForFaults(faults) ?? [];

  // 4) Merge
  const out = {
    ...base,
    ...assessed,
    drills,
    meta: {
      ...(base?.meta ?? {}),
      ...(assessed?.meta ?? {}),
      builtAt: new Date().toISOString(),
      pipeline: "post-estimation-v2",
      sourceRep: path.basename(src),
    },
  };

  // Write to public/reports
  const reportsDir = path.join(process.cwd(), "public", "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const outName = `rep_post_${nowStamp()}.json`;
  const outPath = path.join(reportsDir, outName);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

  // Update latest.json
  const latestPath = path.join(reportsDir, "latest.json");
  fs.writeFileSync(latestPath, JSON.stringify(out, null, 2), "utf8");

  console.log("WROTE:", outPath);
  console.log("UPDATED:", latestPath);
  console.log("FAULTS:", Array.isArray(faults) ? faults.join(", ") : String(faults));
}

main().catch((e: any) => {
  console.error("FAIL:", e?.message || e);
  process.exit(1);
});
