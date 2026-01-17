"use client";

import React from "react";
import { analyzeSwing } from "../../lib/analyze";
import { postAssess } from "../../lib/postAssess";

type Intake = { audience?: "adult" | "junior"; focus?: string; fileName?: string | null; createdAt?: string };

function getIsGolden(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("golden") === "1";
}

export default function CardClient() {
  const [intake, setIntake] = React.useState<Intake | null>(null);

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem("vca_intake");
      if (raw) setIntake(JSON.parse(raw));
    } catch {}
  }, []);

  const isGolden = getIsGolden();

  const reportData = React.useMemo(() => {
    return analyzeSwing({ mode: isGolden ? "golden" : "upload", intake });
  }, [isGolden, intake]);

  const post = React.useMemo(() => postAssess(reportData as any), [reportData]);

  // Minimal one-page print layout
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 16, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 1, fontWeight: 800, opacity: 0.8 }}>VIRTUAL COACH AI</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>AI Coaching Card</div>
          </div>
          <button
            onClick={() => window.print()}
            style={{
              borderRadius: 12,
              padding: "10px 14px",
              border: "1px solid rgba(0,0,0,0.2)",
              background: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Print
          </button>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ padding: 14, borderRadius: 14, background: "rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>ONE PRIORITY</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>{post?.priorityLabel || "—"}</div>
            <div style={{ marginTop: 10, lineHeight: 1.35 }}>{post?.whyNow || "—"}</div>
          </div>

          <div style={{ padding: 14, borderRadius: 14, background: "rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>WHAT TO AVOID TODAY</div>
            <div style={{ marginTop: 10, lineHeight: 1.35 }}>{post?.avoidList || "—"}</div>

            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8, marginTop: 14 }}>CONFIDENCE NOTE</div>
            <div style={{ marginTop: 10, lineHeight: 1.35 }}>{post?.confidenceCue || "—"}</div>
          </div>
        </div>

        <div style={{ marginTop: 12, padding: 14, borderRadius: 14, border: "1px dashed rgba(0,0,0,0.25)" }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>NEXT 15 MINUTES (SIMPLE)</div>
          <ol style={{ marginTop: 10, paddingLeft: 18, lineHeight: 1.5 }}>
            <li>Do 5 slow reps (no ball) focusing only on the ONE priority.</li>
            <li>Hit 10 balls at 70% speed. Track start line + contact.</li>
            <li>Film 2 swings. If the picture improves, keep it. If not, slow down.</li>
          </ol>
        </div>

        <div style={{ marginTop: 12, fontSize: 11, opacity: 0.75 }}>
          Note: “AI” here means pattern recognition + coaching logic from your checkpoints. It’s guidance, not magic. (Sadly.)
        </div>
      </div>

      <style jsx global>{`
        @media print {
          button { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
