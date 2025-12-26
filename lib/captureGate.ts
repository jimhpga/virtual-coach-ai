export type CaptureQuality = "PASS" | "WARN" | "FAIL";

export type CaptureCheck = {
  quality: CaptureQuality;
  reasons: string[];
  instructions: string[];
  freeRetryEligible: boolean;
};

export function runCaptureQualityGate(input: {
  angleHint?: "face-on" | "down-the-line" | "unknown";
  hasFullBody?: boolean;
  hasClubVisible?: boolean;
  hasFeetVisible?: boolean;
  isTooDark?: boolean;
  isShaky?: boolean;
}): CaptureCheck {
  const reasons: string[] = [];
  const instructions: string[] = [];

  // Minimal v1 rules (safe, obvious failures)
  if (input.hasFeetVisible === false || input.hasClubVisible === false) {
    reasons.push("The video cuts off key parts (feet/club).");
    instructions.push("Frame the shot so feet + clubhead are visible the whole swing.");
  }
  if (input.isTooDark) {
    reasons.push("Lighting is too dark to analyze reliably.");
    instructions.push("Add light or film outdoors / near a bright window.");
  }
  if (input.isShaky) {
    reasons.push("Camera shake makes tracking unreliable.");
    instructions.push("Use a tripod or lean the phone against something stable.");
  }

  if (reasons.length >= 1) {
    return {
      quality: "FAIL",
      reasons,
      instructions,
      freeRetryEligible: true,
    };
  }

  return {
    quality: "PASS",
    reasons: [],
    instructions: [],
    freeRetryEligible: false,
  };
}
