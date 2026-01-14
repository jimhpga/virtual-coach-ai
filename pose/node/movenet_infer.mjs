import fs from "fs";
import path from "path";
import process from "process";

import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import sharp from "sharp";

function arg(name, def=null){
  const i = process.argv.indexOf(name);
  if(i === -1) return def;
  return process.argv[i+1] ?? def;
}

const framesDir = arg("--framesDir");
const outDir    = arg("--outDir");
const fps       = parseInt(arg("--fps","30"),10);

if(!framesDir || !outDir){
  console.error("Usage: node movenet_infer.mjs --framesDir <dir> --outDir <dir> [--fps 30]");
  process.exit(1);
}

if(!fs.existsSync(framesDir)){
  console.error("Frames dir not found:", framesDir);
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

function listFrames(dir){
  return fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith(".jpg") || f.toLowerCase().endsWith(".jpeg") || f.toLowerCase().endsWith(".png"))
    .sort();
}

function pick(kps, name){
  const kp = kps.find(k => (k.name || k.part) === name);
  if(!kp) return null;
  const x = kp.x ?? kp.position?.x;
  const y = kp.y ?? kp.position?.y;
  const s = kp.score ?? kp.confidence ?? null;
  if(typeof x !== "number" || typeof y !== "number") return null;
  return { x, y, score: s };
}

function norm(pt, w, h){
  if(!pt) return null;
  return {
    x: +(pt.x / w).toFixed(5),
    y: +(pt.y / h).toFixed(5),
    score: pt.score == null ? null : +(+pt.score).toFixed(4)
  };
}

async function decodeToTensor(imagePath){
  // Do NOT attempt colourspace conversion. Just decode to raw pixels.
  // Remove alpha so we end with 3 channels.
  const pipeline = sharp(imagePath).removeAlpha();

  // resolveWithObject gives us { data, info } where info has width/height/channels
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const ch = info.channels;

  if(!w || !h) throw new Error("Could not read image size for " + imagePath);
  if(ch !== 3){
    throw new Error(`Expected 3 channels after removeAlpha(), got ${ch} for ${imagePath}`);
  }

  const tensor = tf.tensor3d(new Uint8Array(data), [h, w, 3], "int32");
  return { tensor, w, h };
}

(async () => {
  await tf.ready();

  const model = poseDetection.SupportedModels.MoveNet;
  const detectorConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    enableSmoothing: true
  };

  const detector = await poseDetection.createDetector(model, detectorConfig);

  const files = listFrames(framesDir);
  if(files.length === 0){
    console.error("No frames found in:", framesDir);
    process.exit(1);
  }

  console.log(`Frames: ${files.length} | FPS=${fps}`);
  let idx = 0;
  let wrote = 0;

  for(const file of files){
    idx++;
    const fp = path.join(framesDir, file);

    let imgTensor, w, h;
    try{
      const decoded = await decodeToTensor(fp);
      imgTensor = decoded.tensor;
      w = decoded.w;
      h = decoded.h;
    } catch(e){
      console.warn("decode failed on", file, e?.message || e);
      continue;
    }

    let poses = [];
    try{
      poses = await detector.estimatePoses(imgTensor, { flipHorizontal: false });
    } catch(e){
      console.warn("estimatePoses failed on", file, e?.message || e);
      poses = [];
    }

    let out = {
      frame: idx,
      w,
      h,
      fps,
      hips: null,
      shoulders: null,
      leadWrist: null,
      rawScore: null
    };

    if(poses && poses.length){
      const kp = poses[0].keypoints || [];
      const lh = pick(kp, "left_hip");
      const rh = pick(kp, "right_hip");
      const ls = pick(kp, "left_shoulder");
      const rs = pick(kp, "right_shoulder");
      const lw = pick(kp, "left_wrist");

      const mid = (a,b) => (a && b)
        ? { x:(a.x+b.x)/2, y:(a.y+b.y)/2, score: ((a.score??0) + (b.score??0))/2 }
        : (a || b || null);

      const hips = mid(lh, rh);
      const sh   = mid(ls, rs);

      out.hips = norm(hips, w, h);
      out.shoulders = norm(sh, w, h);
      out.leadWrist = norm(lw, w, h);

      const scs = [out.hips?.score, out.shoulders?.score, out.leadWrist?.score].filter(x => typeof x === "number");
      out.rawScore = scs.length ? +(scs.reduce((a,b)=>a+b,0)/scs.length).toFixed(4) : null;
    }

    const outPath = path.join(outDir, `pose_${String(idx).padStart(4,"0")}.json`);
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
    wrote++;

    tf.dispose(imgTensor);

    if(idx % 25 === 0) console.log(`.. ${idx}/${files.length} (wrote ${wrote})`);
  }

  console.log(`✅ Done. Wrote ${wrote} JSON files to:`, outDir);
  process.exit(0);
})();
