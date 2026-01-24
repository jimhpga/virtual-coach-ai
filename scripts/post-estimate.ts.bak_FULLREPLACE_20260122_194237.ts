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

function isUrl(u: string) {
  return /^(https?:|file:|data:|node:)/i.test(u || "");
}

function asFileUrlIfAbs(p: string) {
  if (!p) return "";
  if (isUrl(p)) return p;
  if (path.isAbsolute(p)) return pathToFileURL(p).toString();
  return p;
}

function readJsonFile(p: string) {
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

async function readJsonFromUrl(u: string) {
  // Node 20 has global fetch
  const res = await fetch(u, { cache: "no-store" as any });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${u}`);
  return await res.json();
}

async function loadPoseFromRep(rep: AnyObj): Promise<any> {
  // 0) Native "pose-only" artifact: frames at top-level
  // rep_pose_*.json in our pipeline is often { fps, frameCount, frames, ... }
  if (Array.isArray(rep.frames) && rep.frames.length) {
    // Try to infer width/height from input if present
    const w = rep?.input?.width ?? rep?.input?.w ?? rep?.width ?? 0;
    const h = rep?.input?.height ?? rep?.input?.h ?? rep?.height ?? 0;

    // Normalize to PoseJson-like object expected by downstream libs
    return {
      version: Number(rep.version ?? 1),
      fps: Number(rep.fps ?? 0),
      width: Number(w ?? 0),
      height: Number(h ?? 0),
      frames: rep.frames,
    };
  }

  // 1) Embedded under explicit keys
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

  // 2) URL keys
  const poseUrl =
    rep.poseUrl ||
    rep.pose_url ||
    rep.poseURL ||
    rep.poseJsonUrl ||
    rep.pose_json_url ||
    rep.data?.poseUrl ||
    rep.data?.pose_url ||
    rep.input?.poseUrl ||
    rep.input?.pose_url ||
    "";
  if (poseUrl) {
    if (/^file:/i.test(poseUrl)) return await readJsonFromUrl(poseUrl);
    if (/^https?:/i.test(poseUrl)) return await readJsonFromUrl(poseUrl);
    if (String(poseUrl).startsWith("/")) {
      const base = rep.baseUrl || rep.base_url || "http://localhost:3000";
      return await readJsonFromUrl(String(base).replace(/\/+$/, "") + poseUrl);
    }
  }

  // 3) Local file path keys
  const posePath =
    rep.posePath ||
    rep.pose_path ||
    rep.poseFile ||
    rep.pose_file ||
    rep.data?.posePath ||
    rep.data?.pose_path ||
    rep.input?.posePath ||
    rep.input?.pose_path ||
    "";
  if (posePath) {
    const p = String(posePath);
    const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
    if (!fs.existsSync(abs)) throw new Error(`posePath not found: ${abs}`);
    return readJsonFile(abs);
  }

  return null;
}function pickExport(mod: AnyObj, names: string[], hintRegex?: RegExp) {
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

  const rep = readJsonFile(src);
  const pose = await loadPoseFromRep(rep);
  if (!pose) throw new Error("No pose data found on rep (expected rep.pose, or rep.poseUrl/posePath).");

  // Dynamic import internal libs (works in tsx)
  const detUrl    = asFileUrlIfAbs(path.join(process.cwd(), "app", "lib", "deterministicCoach"));
  const postUrl   = asFileUrlIfAbs(path.join(process.cwd(), "app", "lib", "postAssess"));
  const drillsUrl = asFileUrlIfAbs(path.join(process.cwd(), "app", "_logic", "drills"));

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

  // 1) Build deterministic base report
  const base = deterministicCoach({ pose }) ?? {};

  // 2) Post assessment (faults + derived metrics)
  const assessed = postAssess({ pose, base }) ?? {};

  // 3) Fault list normalize
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
      pipeline: "post-estimation-v3",
      sourceRep: path.basename(src),
      poseSource:
        (rep.poseUrl || rep.pose_url || rep.posePath || rep.pose_path || (rep.data?.poseUrl ?? "") || "embedded").toString(),
    },
  };

  const reportsDir = path.join(process.cwd(), "public", "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const outName = `rep_post_${nowStamp()}.json`;
  const outPath = path.join(reportsDir, outName);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

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



