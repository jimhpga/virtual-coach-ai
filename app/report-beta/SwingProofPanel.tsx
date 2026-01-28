"use client";

import React, { useMemo, useRef, useState } from "react";

type Line = { x1: number; y1: number; x2: number; y2: number };

export default function SwingProofPanel(props: {
  thumbUrl: string;   // still image (impact/P7 recommended)
  videoUrl?: string;  // swing clip URL (optional)
  title?: string;     // label text
  defaultLines?: Line[]; // optional preset arrows
  width?: number;     // default 320
}) {
  const w = props.width ?? 320;
  const h = Math.round(w * 9 / 16);

  const [isPlaying, setIsPlaying] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [lines, setLines] = useState<Line[]>(props.defaultLines ?? []);
  const [drawing, setDrawing] = useState<Line | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const viewW = 1000;
  const viewH = 562;

  const label = props.title ?? "Your uploaded swing (analyzed)";

  function pt(e: React.PointerEvent, el: SVGSVGElement) {
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * viewW;
    const y = ((e.clientY - r.top) / r.height) * viewH;
    return { x, y };
  }

  const canPlay = !!(props.videoUrl && props.videoUrl.trim().length > 0);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>{label}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setDrawMode(v => !v)}
            style={{
              height: 28,
              padding: "0 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.14)",
              background: drawMode ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.22)",
              color: "rgba(255,255,255,0.9)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700
            }}
            title="Toggle drawing arrows"
          >
            {drawMode ? "Draw: ON" : "Draw"}
          </button>

          <button
            type="button"
            onClick={() => { setLines([]); setDrawing(null); }}
            style={{
              height: 28,
              padding: "0 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.22)",
              color: "rgba(255,255,255,0.9)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700
            }}
            title="Clear arrows"
          >
            Clear
          </button>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          width: w,
          height: h,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.20)"
        }}
      >
        {!isPlaying || !canPlay ? (
          <>
            <img
              src={props.thumbUrl}
              alt="Your swing thumbnail"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {canPlay ? (
              <button
                type="button"
                onClick={() => setIsPlaying(true)}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(0,0,0,0.25)",
                  color: "white",
                  border: 0,
                  cursor: "pointer"
                }}
                title="Play your swing"
              >
                <div style={{
                  width: 54, height: 54, borderRadius: 999,
                  display: "grid", placeItems: "center",
                  background: "rgba(0,0,0,0.45)",
                  border: "1px solid rgba(255,255,255,0.20)",
                  fontSize: 22, fontWeight: 900
                }}>▶</div>
              </button>
            ) : null}
          </>
        ) : (
          <video
            src={props.videoUrl}
            controls
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}

        {/* Overlay arrows (SVG). pointerEvents enabled only when Draw mode is ON */}
        <svg
          ref={svgRef}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: drawMode ? "auto" : "none"
          }}
          viewBox={`0 0 ${viewW} ${viewH}`}
          preserveAspectRatio="none"
          onPointerDown={(e) => {
            if (!drawMode || !svgRef.current) return;
            const p = pt(e, svgRef.current);
            setDrawing({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
          }}
          onPointerMove={(e) => {
            if (!drawMode || !drawing || !svgRef.current) return;
            const p = pt(e, svgRef.current);
            setDrawing({ ...drawing, x2: p.x, y2: p.y });
          }}
          onPointerUp={() => {
            if (!drawMode || !drawing) return;
            // Ignore tiny scribbles
            const dx = drawing.x2 - drawing.x1;
            const dy = drawing.y2 - drawing.y1;
            if (Math.hypot(dx, dy) > 40) setLines(prev => [...prev, drawing]);
            setDrawing(null);
          }}
        >
          <defs>
            <marker id="arrowHead" markerWidth="16" markerHeight="16" refX="13" refY="8" orient="auto">
              <path d="M0,0 L16,8 L0,16 Z" fill="rgba(255,255,255,0.9)" />
            </marker>
          </defs>

          {lines.map((l, i) => (
            <line
              key={i}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="7"
              strokeLinecap="round"
              markerEnd="url(#arrowHead)"
            />
          ))}

          {drawing ? (
            <line
              x1={drawing.x1} y1={drawing.y1} x2={drawing.x2} y2={drawing.y2}
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="7"
              strokeLinecap="round"
              markerEnd="url(#arrowHead)"
            />
          ) : null}
        </svg>
      </div>

      <div style={{ fontSize: 11, opacity: 0.70 }}>
        Tip: Toggle <b>Draw</b>, then click-drag to drop arrows. Keep it simple: 1–2 lines max.
      </div>
    </div>
  );
}
