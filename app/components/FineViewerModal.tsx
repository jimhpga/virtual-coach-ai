"use client";

import React, { useEffect, useMemo } from "react";

type Frame = { p: number; label: string; frame: number; imageUrl: string; thumbUrl?: string };

export default function FineViewerModal(props: {
  open: boolean;
  frames: Frame[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
  title?: string;
}) {
  const { open, frames, index, onClose, onIndex, title } = props;

  const safeIndex = useMemo(() => {
    if (!frames?.length) return 0;
    return Math.max(0, Math.min(index, frames.length - 1));
  }, [index, frames]);

  const current = frames?.[safeIndex];

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndex(Math.max(0, safeIndex - 1));
      if (e.key === "ArrowRight") onIndex(Math.min(frames.length - 1, safeIndex + 1));
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, safeIndex, frames?.length, onClose, onIndex]);

  if (!open) return null;

  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.72)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  };

  const panel: React.CSSProperties = {
    width: "min(1100px, 96vw)",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "linear-gradient(180deg, rgba(10,18,28,0.96), rgba(6,10,16,0.96))",
    boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
    overflow: "hidden",
  };

  const top: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
  };

  const btn: React.CSSProperties = {
    height: 36,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.25)",
    color: "#e9f1ff",
    fontWeight: 900,
    cursor: "pointer",
  };

  const main: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 0,
  };

  const imgWrap: React.CSSProperties = {
    background: "#000",
    position: "relative",
  };

  const navBtn: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 44,
    height: 44,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
    fontWeight: 1000,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    userSelect: "none",
  };

  const strip: React.CSSProperties = {
    display: "flex",
    gap: 10,
    padding: 12,
    overflowX: "auto",
    borderTop: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.25)",
  };

  const chip: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.85,
    padding: "2px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    fontWeight: 900,
  };

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div style={panel} onMouseDown={(e) => e.stopPropagation()}>
        <div style={top}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 1000, color: "#e9f1ff" }}>{title || "Fine Viewer"}</div>
            {current && <div style={chip}>{current.label} • frame {current.frame}</div>}
            <div style={{ fontSize: 12, opacity: 0.7 }}>ESC close • ← → step</div>
          </div>
          <button style={btn} onClick={onClose}>Close</button>
        </div>

        <div style={main}>
          <div style={imgWrap}>
            <button
              style={{ ...navBtn, left: 12, opacity: safeIndex === 0 ? 0.35 : 1 }}
              onClick={() => onIndex(Math.max(0, safeIndex - 1))}
              disabled={safeIndex === 0}
              aria-label="Previous frame"
            >
              ‹
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current?.imageUrl}
              alt={current?.label || "Frame"}
              style={{ width: "100%", maxHeight: "72vh", objectFit: "contain", display: "block" }}
            />

            <button
              style={{ ...navBtn, right: 12, opacity: safeIndex === frames.length - 1 ? 0.35 : 1 }}
              onClick={() => onIndex(Math.min(frames.length - 1, safeIndex + 1))}
              disabled={safeIndex === frames.length - 1}
              aria-label="Next frame"
            >
              ›
            </button>
          </div>

          <div style={strip}>
            {frames.map((f, i) => {
              const active = i === safeIndex;
              const isFinish = f.p >= 7;
              return (
                <button
                  key={f.p}
                  onClick={() => onIndex(i)}
                  style={{
                    minWidth: 92,
                    borderRadius: 14,
                    border: active ? "2px solid rgba(31,111,255,0.95)" : "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.20)",
                    color: "#e9f1ff",
                    overflow: "hidden",
                    cursor: "pointer",
                    padding: 0,
                    boxShadow: active ? "0 10px 30px rgba(31,111,255,0.18)" : "none",
                  }}
                >
                  <div style={{ padding: "6px 8px", display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 12 }}>
                    <span>{f.label}</span>
                    <span style={{ opacity: 0.8 }}>{isFinish ? "Finish" : ""}</span>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.thumbUrl || f.imageUrl} alt={f.label} style={{ width: "100%", height: 70, objectFit: "cover", display: "block" }} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
