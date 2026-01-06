import type { SwingDetectionResult, SwingFrame, SwingPhase, JointName } from "../../contracts/swingFrame";

const phases: SwingPhase[] = ["P1","P2","P3","P4","P5","P6","P7","P8","P9"];
const jointList: JointName[] = ["head","neck","lShoulder","rShoulder","lElbow","rElbow","lWrist","rWrist","pelvis","lHip","rHip","lKnee","rKnee","lAnkle","rAnkle"];

function makeJoints(i: number) {
  const ax = 0.52 + (i - 4) * 0.01;
  const ay = 0.48 + (i < 4 ? -0.01 : 0.01) * Math.min(Math.abs(i - 4), 3);

  const pts: any = {
    head: {x: ax, y: ay - 0.20, c: 0.95},
    neck: {x: ax, y: ay - 0.15, c: 0.95},
    lShoulder: {x: ax - 0.07, y: ay - 0.14, c: 0.90},
    rShoulder: {x: ax + 0.07, y: ay - 0.14, c: 0.90},
    lElbow: {x: ax - 0.11, y: ay - 0.08, c: 0.85},
    rElbow: {x: ax + 0.10, y: ay - 0.07, c: 0.85},
    lWrist: {x: ax - 0.14, y: ay - 0.02, c: 0.80},
    rWrist: {x: ax + 0.13, y: ay - 0.01, c: 0.80},
    pelvis: {x: ax, y: ay, c: 0.95},
    lHip: {x: ax - 0.05, y: ay + 0.02, c: 0.90},
    rHip: {x: ax + 0.05, y: ay + 0.02, c: 0.90},
    lKnee: {x: ax - 0.04, y: ay + 0.10, c: 0.85},
    rKnee: {x: ax + 0.04, y: ay + 0.10, c: 0.85},
    lAnkle: {x: ax - 0.03, y: ay + 0.18, c: 0.80},
    rAnkle: {x: ax + 0.03, y: ay + 0.18, c: 0.80},
  };

  pts.lWrist.x += (i - 4) * 0.01;
  pts.rWrist.x += (i - 4) * 0.012;

  return jointList.map((name) => ({ name, ...pts[name] }));
}

export function getMockSwingDetection(): SwingDetectionResult {
  const frames: SwingFrame[] = phases.map((phase, i) => ({
    frameId: `mock-${phase}`,
    phase,
    tMs: i * 120,
    joints: makeJoints(i),
    metrics: { swingScore: 82, demo: true }
  }));

  const phaseConfidence = {
    P1: 0.70, P2: 0.72, P3: 0.75, P4: 0.88,
    P5: 0.78, P6: 0.83, P7: 0.92, P8: 0.84, P9: 0.73
  } as any;

  return { frames, phaseConfidence, notes: ["Mock detection output (UI wiring mode)."] };
}


