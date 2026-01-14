import type { NextApiRequest, NextApiResponse } from "next";

type Status = "ON_TRACK" | "NEEDS_ATTENTION" | "PRIORITY_FIX";

type Keypoint = {
  name: string;
  x: number;   // normalized 0..1
  y: number;   // normalized 0..1
  score: number; // 0..1
};

type PoseFrame = {
  frameIndex: number;
  phase: string; // "P1".."P9"
  points: Keypoint[];
};

type PoseEstimateResponse = {
  ok: true;
  source: "mock";
  uploadId: string;
  activePhase: string;
  generatedAt: string;
  overall: {
    confidence: number;
    stability: number;
    speed: number;
  };
  angles: { label: string; valueDeg: number; status: Status }[];
  frames: PoseFrame[];
};

type ErrorResponse = { ok: false; error: string };

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function pickStatus(r: number): Status {
  if (r < 0.62) return "ON_TRACK";
  if (r < 0.92) return "NEEDS_ATTENTION";
  return "PRIORITY_FIX";
}

function seededRand(seed: number) {
  // deterministic PRNG
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeMockKeypoints(rand: () => number): Keypoint[] {
  const names = [
    "nose",
    "left_eye",
    "right_eye",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
  ] as const;

  const base: Record<(typeof names)[number], { x: number; y: number }> = {
    nose: { x: 0.50, y: 0.18 },
    left_eye: { x: 0.48, y: 0.17 },
    right_eye: { x: 0.52, y: 0.17 },
    left_shoulder: { x: 0.44, y: 0.28 },
    right_shoulder: { x: 0.56, y: 0.28 },
    left_elbow: { x: 0.40, y: 0.40 },
    right_elbow: { x: 0.62, y: 0.40 },
    left_wrist: { x: 0.36, y: 0.52 },
    right_wrist: { x: 0.66, y: 0.52 },
    left_hip: { x: 0.47, y: 0.52 },
    right_hip: { x: 0.53, y: 0.52 },
    left_knee: { x: 0.47, y: 0.72 },
    right_knee: { x: 0.53, y: 0.72 },
    left_ankle: { x: 0.47, y: 0.92 },
    right_ankle: { x: 0.53, y: 0.92 },
  };

  return names.map((name) => {
    const jx = (rand() - 0.5) * 0.03;
    const jy = (rand() - 0.5) * 0.03;
    const score = clamp01(0.72 + rand() * 0.26);
    return {
      name,
      x: clamp01(base[name].x + jx),
      y: clamp01(base[name].y + jy),
      score,
    };
  });
}

const PHASES = [
  { id: "P1", label: "Setup" },
  { id: "P2", label: "Shaft parallel backswing" },
  { id: "P3", label: "Lead arm parallel backswing" },
  { id: "P4", label: "Top" },
  { id: "P5", label: "Lead arm parallel downswing" },
  { id: "P6", label: "Shaft parallel downswing" },
  { id: "P7", label: "Impact" },
  { id: "P8", label: "Trail arm parallel follow-through" },
  { id: "P9", label: "Finish" },
] as const;

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<PoseEstimateResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const uploadId =
    typeof req.body?.uploadId === "string" && req.body.uploadId.trim()
      ? req.body.uploadId.trim()
      : "demo";

  const activePhase =
    typeof req.body?.activePhase === "string" && req.body.activePhase.trim()
      ? req.body.activePhase.trim()
      : "P5";

  const rand = seededRand(hashStr(uploadId + "|" + activePhase));

  const overall = {
    confidence: clamp01(0.78 + rand() * 0.18),
    stability: clamp01(0.62 + rand() * 0.30),
    speed: clamp01(0.55 + rand() * 0.35),
  };

  const angleLabels = [
    "Spine tilt",
    "Pelvis rotation",
    "Shoulder turn",
    "Lead wrist",
    "Trail elbow",
    "Hip depth",
    "Head stability",
  ];

  const angles = angleLabels.map((label) => {
    const valueDeg = Math.round(10 + rand() * 55);
    const status = pickStatus(rand());
    return { label, valueDeg, status };
  });

  const frames: PoseFrame[] = PHASES.map((p, i) => ({
    frameIndex: i,
    phase: p.id,
    points: makeMockKeypoints(seededRand(hashStr(uploadId + "|" + p.id))),
  }));

  res.status(200).json({
    ok: true,
    source: "mock",
    uploadId,
    activePhase,
    generatedAt: new Date().toISOString(),
    overall,
    angles,
    frames,
  });
}
