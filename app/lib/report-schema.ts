export type VcaHandedness = "right" | "left";
export type VcaStatus = "on_track" | "needs_attention" | "priority_fix";

export type VcaFault = {
  key: string;
  label: string;
  score?: number;
  meaning?: string;
  youtubeUrl?: string;
  drills?: string[];
};

export type VcaCheckpoint = {
  p: number;               // 1..9
  label: string;           // "Setup" etc
  status: VcaStatus;
  coachNotes: string;
  commonMisses: string[];
  keyDrills: string[];
  youtubeUrl?: string;
};

export type VcaReport = {
  meta: {
    headline: string;
    generatedAt: string;
    playerName?: string;
    handedness?: VcaHandedness;
    eyeDominance?: string;
    hcp?: string | number;
    club?: string;
    demoSafe?: boolean;
  };

  scores: {
    swingScore: number;
    speed: number;
    efficiency: number;
    swing: number;
    power: number;
    reliability: number;
    consistency: number;
    grades?: Record<string,string>;
  };

  tourDnaMatch?: { name: string; score: number; disclaimer?: string };

  overview: {
    narrative: string;
    highlights: string[];
  };

  priority: {
    label: string;
    whyNow: string;
    avoidList: string;
  };

  faults: VcaFault[];

  checkpoints: VcaCheckpoint[];

  practicePlan14: string[];

  clipUrl?: string;
};
