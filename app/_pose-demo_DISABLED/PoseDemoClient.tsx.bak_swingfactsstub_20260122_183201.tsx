"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { SwingFactsCard } from "@/app/components/SwingFactsCard";
type PoseFrame = {
  frame: number;
  hips?: { x: number; y: number };
  shoulders?: { x: number; y: number };
  leadWrist?: { x: number; y: number };
  // Future: add more joints when real MoveNet is wired
};

const FPS_DEFAULT = 30;

export default function PoseDemoClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [poses, setPoses] = useState<PoseFrame[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [fps, setFps] = useState(FPS_DEFAULT);

  const poseIndex = useMemo(() => {
    const m = new Map<number, PoseFrame>();
    poses.forEach(p => m.set(p.frame, p));
    return m;
  }, [poses]);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const r = await fetch("/pose-demo/pose_all.json", { cache: "no-store" });
        if (!r.ok) throw new Error(`pose_all.json fetch failed: ${r.status}`);
        const j = await r.json();
        if (!Array.isArray(j)) throw new Error("pose_all.json must be an array");
        setPoses(j as PoseFrame[]);
      } catch (e: any) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  // Keep canvas sized to video on layout/resize
  useEffect(() => {
    const syncSize = () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c) return;
      const rect = v.getBoundingClientRect();
      c.width = Math.max(1, Math.floor(rect.width));
      c.height = Math.max(1, Math.floor(rect.height));
      c.style.width = rect.width + "px";
      c.style.height = rect.height + "px";
    };

    syncSize();
    window.addEventListener("resize", syncSize);
    return () => window.removeEventListener("resize", syncSize);
  }, []);

  // Draw loop synced to video time
  useEffect(() => {
    let raf = 0;

    const draw = () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c) { raf = requestAnimationFrame(draw); return; }
      const ctx = c.getContext("2d");
      if (!ctx) { raf = requestAnimationFrame(draw); return; }

      // Clear
      ctx.clearRect(0, 0, c.width, c.height);

      if (showOverlay && poses.length > 0 && !v.paused && !v.ended) {
        const idx = Math.max(1, Math.min(poses.length, Math.floor(v.currentTime * fps) + 1));
        const pf = poseIndex.get(idx);

        if (pf) {
          // Draw 3 demo joints (normalized x/y in [0..1])
          const pts: Array<{ key: string; p?: { x: number; y: number } }> = [
            { key: "hips", p: pf.hips },
            { key: "shoulders", p: pf.shoulders },
            { key: "leadWrist", p: pf.leadWrist },
          ];

          // Simple lines (hips -> shoulders -> leadWrist)
          const toXY = (p: { x: number; y: number }) => ({ x: p.x * c.width, y: p.y * c.height });

          const good = pts.filter(x => x.p && Number.isFinite(x.p.x) && Number.isFinite(x.p.y)) as any[];
          if (good.length >= 2) {
            ctx.lineWidth = 3;
            ctx.beginPath();
            const a = toXY(good[0].p);
            ctx.moveTo(a.x, a.y);
            for (let i = 1; i < good.length; i++) {
              const b = toXY(good[i].p);
              ctx.lineTo(b.x, b.y);
            }
            ctx.stroke();
          }

          // Dots + labels
          good.forEach((g: any) => {
            const q = toXY(g.p);
            ctx.beginPath();
            ctx.arc(q.x, q.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
            ctx.fillText(g.key, q.x + 8, q.y - 8);
          });

          // Frame indicator
          ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
          ctx.fillText(`frame ${idx}/${poses.length}`, 10, 18);
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [poses, poseIndex, showOverlay, fps]);

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    padding: 20,
  };

  const card: React.CSSProperties = {
    maxWidth: 980,
    margin: "0 auto",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.20)",
    padding: 16,
  };

  const row: React.CSSProperties = {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 12,
  };

  const btn: React.CSSProperties = {
    height: 34,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.22)",
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  };

  return (
    <div style={shell}>
{/* VCA_SWING_FACTS_CARD */}
<SwingFactsCard url="/pose-demo/swing_facts.json" />
      <div style={card}>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>Pose Demo (Overlay Proof)</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 12 }}>
          This page proves the pipeline: video → frames → pose JSON → overlay. (Currently stub joints; wire MoveNet next.)
        </div>

        <div style={row}>
          <button style={btn} onClick={() => setShowOverlay(v => !v)}>
            {showOverlay ? "Hide Overlay" : "Show Overlay"}
          </button>

          <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.9 }}>FPS</div>
          <input
            type="number"
            value={fps}
            min={10}
            max={120}
            onChange={(e) => setFps(parseInt(e.target.value || "30", 10))}
            style={{
              height: 34, width: 80,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(0,0,0,0.22)",
              color: "rgba(255,255,255,0.92)",
              padding: "0 10px",
              fontWeight: 900,
            }}
          />

          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Poses loaded: <b>{poses.length}</b>
          </div>
        </div>

        {err && (
          <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,80,80,0.35)", marginBottom: 12 }}>
            <div style={{ fontWeight: 900 }}>Error</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{err}</div>
          </div>
        )}

        <div style={{ position: "relative", width: "100%", borderRadius: 16, overflow: "hidden" }}>
          <video
            ref={videoRef}
            src="/pose-demo/swing.mp4"
            controls
            playsInline
            style={{ width: "100%", display: "block", borderRadius: 16 }}
            onPlay={() => {
              // Ensure canvas matches video size on play
              const v = videoRef.current;
              const c = canvasRef.current;
              if (!v || !c) return;
              const rect = v.getBoundingClientRect();
              c.width = Math.max(1, Math.floor(rect.width));
              c.height = Math.max(1, Math.floor(rect.height));
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: showOverlay ? 0.95 : 0,
            }}
          />
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>
          Next: replace stub pose data with real MoveNet joints + smoothing + phase detection.
        </div>
      </div>
    </div>
  );
}

