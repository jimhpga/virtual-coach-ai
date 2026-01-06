"use client";

import React from "react";

type Props = {
  videoRef: React.RefObject<HTMLVideoElement>;
  activePose?: string;
  onSelectPose?: (poseId: string) => void;
};

const poses = ["P1","P2","P3","P4","P5","P6","P7","P8","P9"];

export default function PoseMarks({ videoRef, activePose = "P1", onSelectPose }: Props) {
  // MVP: render clickable pose pills over the video.
  // Real pose extraction can replace this later with true markers/timestamps.
  return (
    <div
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 12,
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none", // allow video controls to still work; pills re-enable pointer events
        zIndex: 5,
      }}
      aria-label="Pose markers"
    >
      {poses.map((p) => {
        const isActive = p === activePose;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onSelectPose?.(p)}
            style={{
              pointerEvents: "auto",
              cursor: "pointer",
              borderRadius: 999,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.2,
              border: "1px solid rgba(255,255,255,0.14)",
              background: isActive ? "rgba(16, 185, 129, 0.22)" : "rgba(0,0,0,0.35)",
              color: "#e6edf6",
              backdropFilter: "blur(10px)",
              boxShadow: "0 8px 22px rgba(0,0,0,0.25)",
            }}
            title={`Jump to ${p}`}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}
