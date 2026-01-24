import fs from "fs";
import path from "path";

function stripHeavy(out: any) {
  // Keep analysis + narrative, drop raw pose frames to avoid giant JSONs.
  if (!out || typeof out !== "object") return out;

  // Remove common heavy keys
  if (Array.isArray((out as any).frames)) delete (out as any).frames;

  if ((out as any).pose && typeof (out as any).pose === "object") {
    if (Array.isArray((out as any).pose.frames)) delete (out as any).pose.frames;
  }
  if ((out as any).poseJson && typeof (out as any).poseJson === "object") {
    if (Array.isArray((out as any).poseJson.frames)) delete (out as any).poseJson.frames;
  }
  if ((out as any).input && typeof (out as any).input === "object" && Array.isArray((out as any).input.frames)) {
    delete (out as any).input.frames;
  }

  return out;
}


type AnyObj = Record<string, any>;

function readJson(p: string): AnyObj {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p: string, obj: any) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}

function getArg(name: string): string {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return "";
}

function resolvePoseFromRep(rep: AnyObj): AnyObj {
  // Your rep_pose file has: { version, input, fps, frameCount, ..., frames }
  // So prefer top-level frames, fallback input.frames
  const pose: AnyObj = {};
  pose.version = rep.version ?? 1;
  pose.fps = rep.fps ?? rep.input?.fps ?? 30;
  pose.width = rep.input?.width ?? rep.width ?? 0;
  pose.height = rep.input?.height ?? rep.height ?? 0;
  pose.frames = rep.frames ?? rep.input?.frames ?? [];
  if (!Array.isArray(pose.frames) || pose.frames.length === 0) {
    throw new Error("No pose frames found (expected rep.frames or rep.input.frames).");
  }
  return pose;
}

function safePickCoachFn(mod: AnyObj): ((args: AnyObj)=>any) | null {
  const candidates = [
    mod?.deterministicCoach,
    mod?.default,
    mod?.coach,
    mod?.buildCoach,
    mod?.makeCoach,
  ];
  for (const c of candidates) {
    if (typeof c === "function") return c;
  }
  return null;
}

async function main() {
  const src = getArg("--src");
  if (!src) throw new Error('Usage: npx tsx .\\scripts\\post-estimate.ts --src "C:\\path\\to\\rep.json"');

  const absSrc = path.isAbsolute(src) ? src : path.join(process.cwd(), src);
  if (!fs.existsSync(absSrc)) throw new Error(`SRC not found: ${absSrc}`);

  const rep = readJson(absSrc);
  const pose = resolvePoseFromRep(rep);

  // Import these lazily so build/dev doesn’t freak out if you move stuff.
  const postAssessMod = await import("../app/lib/postAssess");
  const drillsMod = await import("../app/_logic/drills");
  const coachMod = await import("../app/lib/deterministicCoach").catch(() => ({} as any));

  const postAssess = (postAssessMod as any).postAssess ?? (postAssessMod as any).default;
  if (typeof postAssess !== "function") throw new Error("postAssess export not found in app/lib/postAssess");

  const pickDrillsForFaults =
    (drillsMod as any).pickDrillsForFaults ??
    (drillsMod as any).default ??
    ((faults: any[]) => []);

  const coachFn = safePickCoachFn(coachMod as any);

  // base object for the report
  const base: AnyObj = {
    ...rep,
    meta: {
      ...(rep.meta ?? {}),
      builtAt: new Date().toISOString(),
      pipeline: "post-estimation-v2",
      sourceRepPath: absSrc,
    },
  };

  // 1) deterministic coaching layer (optional)
  let baseCoach: AnyObj = { ...(base ?? {}) };
  if (coachFn) {
    try {
      baseCoach = await coachFn({ pose, base });
    } catch (e: any) {
      console.warn("WARN: deterministicCoach failed, using base:", e?.message || e);
      baseCoach = { ...(base ?? {}) };
    }
  } else {
    console.warn("WARN: deterministicCoach function not found (named/default). Continuing without it.");
  }

  // 2) post-assess layer (faults + scores)
  const assessed = postAssess({ pose, base: baseCoach }) ?? {};
  const faults = assessed?.faults ?? baseCoach?.faultKeys ?? baseCoach?.faults ?? [];
  const faultArr = Array.isArray(faults) ? faults : [];

  // 3) drill selection
  let drills: any[] = [];
  try {
    drills = pickDrillsForFaults(faultArr) ?? [];
  } catch (e: any) {
    console.warn("WARN: pickDrillsForFaults failed:", e?.message || e);
    drills = [];
  }

  const out: AnyObj = {
    ...baseCoach,
    ...assessed,
    drills,
    pose: pose, // keep it in output so Full report can render without extra lookups
    meta: {
      ...(baseCoach?.meta ?? {}),
      ...(assessed?.meta ?? {}),
      builtAt: new Date().toISOString(),
      pipeline: "post-estimation-v2",
      fps: pose.fps,
      framesCount: pose.frames?.length ?? 0,
      sourceRepPath: absSrc,
    },
  };

  // Write outputs
  const reportsDir = path.join(process.cwd(), "public", "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
  const outName = `post_${stamp}.json`;
  const outPath = path.join(reportsDir, outName);

  writeJson(outPath, out);
  writeJson(path.join(reportsDir, "latest.json"), out);

  console.log("WROTE:", outPath);
  console.log("UPDATED:", path.join(reportsDir, "latest.json"));
  console.log("FAULTS:", faultArr.length ? faultArr.join(", ") : "(none)");
}

main().catch((e: any) => {
  console.error("FAIL:", e?.message || e);
  process.exit(1);
});


