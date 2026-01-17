"use client";

import React from "react";

type Fault = { title: string; why: string; fix: string };
type Drill = { name: string; steps: string[]; reps: string };

export default function CardClient() {
  const swingScore = 82;
  const tourDna = "Tour DNA Match: Player R (demo)";

  const topFaults: Fault[] = [
    {
      title: "Face control: slightly open at P6",
      why: "Ball starts right / weak fade pattern under speed.",
      fix: "Keep lead wrist flatter through P5–P7; rotate, don’t flip."
    },
    {
      title: "Pressure shift late (hanging back)",
      why: "Low point drifts back; contact gets thin/heel-y.",
      fix: "Shift to lead side by P5, then rotate around a posted lead leg."
    }
  ];

  const drills: Drill[] = [
    {
      name: "P6 Check + Turn Through",
      steps: [
        "Stop at P6 (shaft parallel downswing).",
        "Lead wrist flat, logo of glove slightly down.",
        "Turn chest to target without adding hand flip."
      ],
      reps: "3 sets of 6 slow reps, then 3 full swings"
    },
    {
      name: "Step-Through Pressure Shift",
      steps: [
        "Start feet together, take club to P2.",
        "Step lead foot to target as arms reach P3–P4.",
        "Swing through to a tall, balanced finish."
      ],
      reps: "2 sets of 8, then 5 normal swings"
    }
  ];

  const pill = (t: string) => (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.25)",
      fontSize: 12,
      letterSpacing: 0.2
    }}>{t}</span>
  );

  return (
    <div style={{
      minHeight: "100vh",
      padding: 20,
      background: "radial-gradient(1200px 600px at 20% 0%, rgba(120,180,255,0.18), rgba(0,0,0,0)), linear-gradient(180deg, #071018, #04070a)",
      color: "#eaf1ff",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
    }}>
      <div style={{
        maxWidth: 980,
        margin: "0 auto",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        overflow: "hidden"
      }}>
        <div style={{
          padding: "18px 18px 14px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.10)"
        }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 14, opacity: 0.85 }}>Virtual Coach AI — Report Card (Demo)</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 0.2 }}>Swing Snapshot</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {pill("P1–P9 Ready")}
            {pill("Golden=1")}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 14, padding: 18 }}>
          <div style={{
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.25)",
            padding: 16,
            display: "grid",
            gap: 12
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontSize: 13, opacity: 0.8 }}>Swing Score</div>
              <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1 }}>{swingScore}</div>
            </div>

            <div style={{ fontSize: 13, opacity: 0.9, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 10 }}>
              {tourDna}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Today’s Priority</div>
              <div style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)"
              }}>
                <div style={{ fontWeight: 800 }}>Face control + pressure shift</div>
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
                  Clean reps first. Speed later. Your ball flight will rat you out.
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div style={{
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.22)",
              padding: 16
            }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Top 2 Faults</div>
              <div style={{ display: "grid", gap: 10 }}>
                {topFaults.map((f, i) => (
                  <div key={i} style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.05)"
                  }}>
                    <div style={{ fontWeight: 900 }}>{i + 1}. {f.title}</div>
                    <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}><b>Why:</b> {f.why}</div>
                    <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}><b>Fix:</b> {f.fix}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.22)",
              padding: 16
            }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>2 Drills (Efficient)</div>
              <div style={{ display: "grid", gap: 10 }}>
                {drills.map((d, i) => (
                  <div key={i} style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.05)"
                  }}>
                    <div style={{ fontWeight: 900 }}>{d.name}</div>
                    <ol style={{ margin: "8px 0 8px 18px", opacity: 0.92, fontSize: 13 }}>
                      {d.steps.map((s, j) => <li key={j} style={{ marginBottom: 4 }}>{s}</li>)}
                    </ol>
                    <div style={{ fontSize: 13, opacity: 0.92 }}><b>Reps:</b> {d.reps}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 12, opacity: 0.7, padding: "0 4px 6px 4px" }}>
              Demo mode: content is representative. Real engine will populate from analysis output.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
