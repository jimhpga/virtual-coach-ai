"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "../_components/Shell";
import { TinyCard, ConfidenceMeter } from "../_components/UI";

function DemoRow({ label, value }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ opacity: 0.8 }}>{label}</div>
      <div style={{ fontWeight: 900 }}>{value}</div>
    </div>
  );
}

export default function InvestorDemo() {
  const [mode, setMode] = useState<"adult"|"junior">("adult");
  const [step, setStep] = useState(1);

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s >= 4 ? 4 : s + 1)), 900);
    return () => clearInterval(t);
  }, []);

  const script = mode === "adult"
    ? "Adult: direct, specific, no fluff."
    : "Junior: simple words, fun metaphors, same truth.";

  return (
    <Shell
      title="Investor Demo"
      subtitle="60 seconds: onboarding → upload → report → confidence."
      right={
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { setMode("adult"); setStep(1); }} style={{ fontWeight: 900 }}>Adult</button>
          <button onClick={() => { setMode("junior"); setStep(1); }} style={{ fontWeight: 900 }}>Junior</button>
          <Link href="/report?golden=1" style={{ color: "#b9cff6", fontWeight: 900 }}>Open Report</Link>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <TinyCard title={`Mode: ${mode.toUpperCase()}`} right={<div style={{ opacity: 0.75 }}>{script}</div>}>
          <DemoRow label="Step 1" value={step >= 1 ? "Sequencing Truth shown" : "…" } />
          <DemoRow label="Step 2" value={step >= 2 ? "Upload → analyze" : "…" } />
          <DemoRow label="Step 3" value={step >= 3 ? "Fault detected + drill prescribed" : "…" } />
          <DemoRow label="Step 4" value={step >= 4 ? "Confidence dip tracked → exit plan" : "…" } />
        </TinyCard>

        <TinyCard title="Confidence Graph (concept)">
          <ConfidenceMeter
            label="Confidence"
            phase={step < 3 ? "Dip" : step < 4 ? "Exit" : "Climb"}
            trend={step < 3 ? "dip" : step < 4 ? "exit" : "climb"}
            score={step < 3 ? 38 : step < 4 ? 55 : 72}
            note={mode === "junior" ? "It feels weird… that means it’s working." : "Gap is normal. Keep the reps clean."}
          />
        </TinyCard>
      </div>
    </Shell>
  );
}
