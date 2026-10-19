"use client";

import React, { useMemo, useRef, useState } from "react";

type Mode = "normal" | "slow";

const CHECKPOINT_FRAMES: Record<number, number> = {
  1: 1,
  2: 12,
  3: 23,
  4: 39,
  5: 49,
  6: 53,
  7: 56,
  8: 59,
  9: 64,
  10: 77,
};

const FPS = 60;

function pill(active = false): React.CSSProperties {
  return {
    height: 34,
    minWidth: 44,
    padding: "0 11px",
    borderRadius: 999,
    border: active
      ? "1px solid rgba(255,255,255,0.42)"
      : "1px solid rgba(255,255,255,0.14)",
    background: active
      ? "rgba(255,255,255,0.14)"
      : "rgba(255,255,255,0.05)",
    color: "#f5f7fb",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
  };
}

export default function ModelSwing3DPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mode, setMode] = useState<Mode>("slow");
  const [selectedP, setSelectedP] = useState<number>(7);

  const src = useMemo(
    () =>
      mode === "slow"
        ? "/vca-3d/FACE_DTL_SLOW4X_60FPS.mp4"
        : "/vca-3d/FACE_DTL_TRUE_SPEED_60FPS.mp4",
    [mode]
  );

  const checkpointTime = (p: number, m: Mode = mode) => {
    const frame = CHECKPOINT_FRAMES[p] ?? 1;
    const normalSeconds = Math.max(0, frame - 1) / FPS;
    return m === "slow" ? normalSeconds * 4 : normalSeconds;
  };

  const jumpTo = (p: number) => {
    setSelectedP(p);
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = checkpointTime(p);
    v.pause();
  };

  const setPlaybackMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
  };

  return (
    <div
      data-testid="model-swing-3d"
      style={{
        marginTop: 14,
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.22)",
        boxShadow: "0 12px 30px rgba(0,0,0,0.28)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 0.7,
              textTransform: "uppercase",
              opacity: 0.72,
            }}
          >
            3D Model Swing
          </div>
          <div style={{ marginTop: 3, fontSize: 13, fontWeight: 800 }}>
            FACE + DTL synchronized
          </div>
          <div style={{ marginTop: 3, fontSize: 11, opacity: 0.64 }}>
            Locked reference motion • 60 fps • P1–P10
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setPlaybackMode("normal")}
            style={pill(mode === "normal")}
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => setPlaybackMode("slow")}
            style={pill(mode === "slow")}
          >
            4× Slow
          </button>
        </div>
      </div>

      <video
        ref={videoRef}
        key={src}
        src={src}
        controls
        playsInline
        preload="metadata"
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (!v) return;
          v.currentTime = checkpointTime(selectedP);
          v.pause();
        }}
        style={{
          width: "100%",
          display: "block",
          aspectRatio: "8 / 3",
          objectFit: "contain",
          borderRadius: 14,
          background: "#050505",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      />

      <div
        style={{
          marginTop: 10,
          display: "flex",
          gap: 7,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setSelectedP(1);
            const v = videoRef.current;
            if (!v) return;
            v.currentTime = 0;
            v.play().catch(() => {});
          }}
          style={{
            ...pill(false),
            minWidth: 78,
          }}
        >
          Play full
        </button>

        {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => jumpTo(p)}
            style={pill(selectedP === p)}
            title={`Jump 3D model to P${p} (F${String(
              CHECKPOINT_FRAMES[p]
            ).padStart(3, "0")})`}
          >
            P{p}
          </button>
        ))}
      </div>
    </div>
  );
}
