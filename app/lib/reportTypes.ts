export type Confidence = "high" | "medium" | "low";

export type Fault = {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  confidence: Confidence;
  evidence?: string[];
  fixes?: string[];
};

export type Checkpoint = {
  p: number;
  title: string;
  coachNotes: string;
  commonMisses: string[];
  keyDrills: string[];
  status: "on_track" | "needs_attention" | "priority_fix";
  confidence: Confidence;
};

export type ReportData = {
  player: { name: string; hand: "right" | "left"; eye: "right" | "left" | "unknown"; hcp?: number; notes?: string; };
  intake?: { mobility?: Record<string, any>; limitations?: string[]; goals?: string[]; };
  scores: { overallGrade: string; speed: number; efficiency: number; consistency: number; };
  narrative: { overview: string; quickHighlights: string[]; topFixes: string[]; powerLeaks: string[]; doingWell: string[]; uncertaintyNote?: string; };
  faults: Fault[];
  checkpoints: Checkpoint[];
  practicePlan: { headline: string; days: Array<{ day: number; focus: string; reps: string; note?: string }>; };
  meta: { mode: "golden" | "upload"; generatedAt: string; };
};
