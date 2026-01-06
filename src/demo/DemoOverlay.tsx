"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { SwingDetectionResult, SwingFrame, SwingPhase, SwingJoint } from "../contracts/swingFrame";
import { getMockSwingDetection } from "../engine/mock/getMockSwingDetection";

function drawSkeleton(ctx: CanvasRenderingContext2D, w: number, h: number, joints: SwingJoint[]) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, w, h);

  const byName = new Map(joints.map(j => [j.name, j]));
  const P = (name: any) => byName.get(name);

  const line = (a: any, b: any, alpha = 0.9) => {
    const A = P(a), B = P(b);
    if (!A || !B) return;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(A.x * w, A.y * h);
    ctx.lineTo(B.x * w, B.y * h);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(120, 210, 255, 0.95)";

  line("head", "neck", 0.9);
  line("neck", "pelvis", 0.9);

  line("lShoulder", "lElbow", 0.9);
  line("lElbow", "lWrist", 0.9);
  line("rShoulder", "rElbow", 0.9);
  line("rElbow", "rWrist", 0.9);

  line("lHip", "lKnee", 0.85);
  line("lKnee", "lAnkle", 0.85);
  line("rHip", "rKnee", 0.85);
  line("rKnee", "rAnkle", 0.85);

  line("lShoulder", "rShoulder", 0.5);
  line("lHip", "rHip", 0.5);

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  for (const j of joints) {
    const c = j.c ?? 0.8;
    const r = 5 + Math.max(0, (c - 0.5) * 4);
    ctx.globalAlpha = 0.35 + c * 0.65;
    ctx.beginPath();
    ctx.arc(j.x * w, j.y * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Virtual Coach AI • Demo Overlay", 14, 22);
}

export default function DemoOverlay() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [data] = useState<SwingDetectionResult>(() => getMockSwingDetection());
  const [phase, setPhase] = useState<SwingPhase>("P7");

  const frame: SwingFrame | undefined = useMemo(
    () => data.frames.find(f => f.phase === phase),
    [data.frames, phase]
  );

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !frame) return;

    const ctx = c.getContext("2d");
    if (!ctx) return;

    const cssW = 900;
    const cssH = 520;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    c.width = cssW * dpr;
    c.height = cssH * dpr;
    c.style.width = cssW + "px";
    c.style.height = cssH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawSkeleton(ctx, cssW, cssH, frame.joints);
  }, [frame]);

  const confidence = data.phaseConfidence?.[phase] ?? 0;

  const downloadPdf = async () => {
    const res = await fetch("/api/demo-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase, confidence })
    });
    if (!res.ok) {
      alert("PDF export failed (demo). Check server console.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "VCA_Demo_Report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    padding: 24,
    background: "radial-gradient(1200px 700px at 30% 10%, rgba(0,180,255,0.18), rgba(0,0,0,0.92))",
    color: "#eaf2ff",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  };

  const card: React.CSSProperties = {
    maxWidth: 980,
    margin: "0 auto",
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.45)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
  };

  const btn: React.CSSProperties = {
    height: 42,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.10)",
    color: "#eaf2ff",
    cursor: "pointer",
    fontWeight: 700
  };

  const pill = (active:boolean): React.CSSProperties => ({
    height: 38,
    padding: "0 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: active ? "rgba(120,210,255,0.22)" : "rgba(255,255,255,0.08)",
    color: "#eaf2ff",
    cursor: "pointer",
    fontWeight: 800,
  });

  return (
    <div style={shell}>
      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap: 12, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>Virtual Coach AI — Demo</div>
            <div style={{ opacity: 0.8, marginTop: 4 }}>P1–P9 selector • skeleton overlay • confidence • PDF export</div>
          </div>
          <button style={btn} onClick={downloadPdf}>Download Demo PDF</button>
        </div>

        <div style={{ marginTop: 14, display:"flex", gap: 8, flexWrap:"wrap" }}>
          {(["P1","P2","P3","P4","P5","P6","P7","P8","P9"] as SwingPhase[]).map(p => (
            <button key={p} style={pill(p===phase)} onClick={() => setPhase(p)}>
              {p}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 12, display:"flex", alignItems:"center", gap: 12, flexWrap:"wrap" }}>
          <div style={{ fontWeight: 900 }}>Selected:</div>
          <div style={{ padding:"6px 10px", borderRadius: 999, background:"rgba(255,255,255,0.10)", border:"1px solid rgba(255,255,255,0.12)" }}>
            {phase}
          </div>
          <div style={{ opacity: 0.85 }}>Confidence: <b>{Math.round(confidence * 100)}%</b></div>
        </div>

        <div style={{ marginTop: 14, borderRadius: 18, overflow:"hidden", border:"1px solid rgba(255,255,255,0.12)" }}>
          <canvas ref={canvasRef} />
        </div>

        <div style={{ marginTop: 14, padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Report Preview</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, opacity: 0.95 }}>
            <div><span style={{ opacity: 0.75 }}>SwingScore:</span> <b>82</b> (demo)</div>
            <div><span style={{ opacity: 0.75 }}>Selected phase:</span> <b>{phase}</b></div>
            <div><span style={{ opacity: 0.75 }}>Confidence:</span> <b>{Math.round(confidence * 100)}%</b></div>
            <div><span style={{ opacity: 0.75 }}>Priority focus:</span> <b>Impact delivery (P7)</b></div>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.45, opacity: 0.9 }}>
            <b>Suggested Next Steps</b><br/>
            1) Verify camera angle (face-on or down-the-line).<br/>
            2) Upload a second swing for consistency check.<br/>
            3) Use 1 drill only until P7 stabilizes.
          </div>
          <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
            Investor/Test Demo • UI stays the same when real pose data replaces mock.
          </div>
        </div>
      </div>
    </div>
  );
}


