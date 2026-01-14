import React, { useEffect, useState } from "react";
import { SwingFactsCard } from "@/app/components/SwingFactsCard";
import PoseDemoClient from "./PoseDemoClient";

export default function Page() {
  
  // ===== VCA_SWING_FACTS_START =====
  type SwingFacts = {
    fps: number;
    frames: number;
    detectedFrames: number;
    detectedRatePct: number;
    confidence: "High" | "Medium" | "Low" | string;
    tempo?: { backswingSec?: number; downswingSec?: number; ratio?: number };
    p?: Record<string, number>;
    generatedAt?: string;
  };

  const [facts, setFacts] = useState<SwingFacts | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/pose-demo/swing_facts.json", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if(alive && j) setFacts(j); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  // ===== VCA_SWING_FACTS_END =====
return <PoseDemoClient />;
}


