export type SwingPhase = "P1"|"P2"|"P3"|"P4"|"P5"|"P6"|"P7"|"P8"|"P9";

export type JointName =
  | "head" | "neck"
  | "lShoulder" | "rShoulder"
  | "lElbow" | "rElbow"
  | "lWrist" | "rWrist"
  | "pelvis"
  | "lHip" | "rHip"
  | "lKnee" | "rKnee"
  | "lAnkle" | "rAnkle";

export type SwingJoint = { name: JointName; x: number; y: number; c?: number };

export type SwingFrame = {
  frameId: string;
  phase: SwingPhase;
  tMs?: number;
  joints: SwingJoint[];
  metrics?: Record<string, number | string | boolean>;
};

export type SwingDetectionResult = {
  frames: SwingFrame[];
  phaseConfidence: Record<SwingPhase, number>;
  notes?: string[];
};
