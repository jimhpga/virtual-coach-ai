"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Mode = "normal" | "slow";
type PlayerPFrame = {
  p: number;
  label: string;
  frame: number;
  imageUrl: string;
  thumbUrl?: string;
};

type Vec3 = [number, number, number];
type SequenceFrame = {
  frame: number;
  body: Record<string, Vec3>;
};
type ClubFrame = {
  frame: number;
  grip_center_m: Vec3;
  clubhead_m: Vec3;
};
type ProjectionView = "face" | "dtl";

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

const PREMIUM_CHECKPOINTS: Partial<Record<number, string>> = {
  1: "/images/avatar/p1.png",
  4: "/images/avatar/p4.png",
  7: "/images/avatar/p7.png",
  10: "/images/avatar/p10.png",
};

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
  const [playerFrames, setPlayerFrames] = useState<PlayerPFrame[]>([]);
  const [sequenceFrames, setSequenceFrames] = useState<SequenceFrame[]>([]);
  const [clubFrames, setClubFrames] = useState<ClubFrame[]>([]);
  const [projectionView, setProjectionView] = useState<ProjectionView>("face");
  const premiumCheckpoint = PREMIUM_CHECKPOINTS[selectedP];
  const playerCheckpoint = playerFrames.find((f) => f.p === selectedP) ?? null;

  useEffect(() => {
    let alive = true;

    Promise.all([
      fetch("/data/pframes-P1-P10.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/vca-3d/v200/sequence.json", { cache: "force-cache" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/vca-3d/v200/club.json", { cache: "force-cache" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([pframes, sequence, club]) => {
        if (!alive) return;

        if (pframes?.ok && Array.isArray(pframes.frames)) {
          setPlayerFrames(
            [...pframes.frames].sort((a: PlayerPFrame, b: PlayerPFrame) => a.p - b.p)
          );
        }

        if (Array.isArray(sequence?.frames)) {
          setSequenceFrames(sequence.frames as SequenceFrame[]);
        }

        if (Array.isArray(club?.frames)) {
          setClubFrames(club.frames as ClubFrame[]);
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

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

  const motionMap = useMemo(() => {
    if (!sequenceFrames.length || !clubFrames.length) return null;

    const selectedFrame = CHECKPOINT_FRAMES[selectedP] ?? 1;
    const axisIndex = projectionView === "face" ? 0 : 1;

    const rawPoints: Array<[number, number]> = [];

    const addVec = (v?: Vec3) => {
      if (!v) return;
      rawPoints.push([v[axisIndex], v[2]]);
    };

    sequenceFrames.forEach((f) => {
      addVec(f.body?.hands);
      addVec(f.body?.left_shoulder);
      addVec(f.body?.right_shoulder);
      addVec(f.body?.left_hip);
      addVec(f.body?.right_hip);
    });

    clubFrames.forEach((f) => {
      addVec(f.grip_center_m);
      addVec(f.clubhead_m);
    });

    if (!rawPoints.length) return null;

    const xs = rawPoints.map((p) => p[0]);
    const zs = rawPoints.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const spanX = Math.max(0.001, maxX - minX);
    const spanZ = Math.max(0.001, maxZ - minZ);

    const project = (v?: Vec3): [number, number] | null => {
      if (!v) return null;
      const x = 8 + ((v[axisIndex] - minX) / spanX) * 84;
      const y = 92 - ((v[2] - minZ) / spanZ) * 84;
      return [x, y];
    };

    const pathFrom = (pts: Array<[number, number] | null>) =>
      pts
        .filter((p): p is [number, number] => Boolean(p))
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
        .join(" ");

    const precisionLimit = Math.min(selectedFrame, 64);
    const bodyTrail = sequenceFrames.filter((f) => f.frame <= precisionLimit);
    const clubTrail = clubFrames.filter((f) => f.frame <= precisionLimit);

    const selectedBody =
      sequenceFrames.find((f) => f.frame === selectedFrame) ??
      sequenceFrames.reduce((best, f) =>
        Math.abs(f.frame - selectedFrame) < Math.abs(best.frame - selectedFrame) ? f : best
      );
    const selectedClub =
      clubFrames.find((f) => f.frame === selectedFrame) ??
      clubFrames.reduce((best, f) =>
        Math.abs(f.frame - selectedFrame) < Math.abs(best.frame - selectedFrame) ? f : best
      );

    return {
      handPath: pathFrom(bodyTrail.map((f) => project(f.body?.hands))),
      clubPath: pathFrom(clubTrail.map((f) => project(f.clubhead_m))),
      gripPath: pathFrom(clubTrail.map((f) => project(f.grip_center_m))),
      shoulderLeft: project(selectedBody.body?.left_shoulder),
      shoulderRight: project(selectedBody.body?.right_shoulder),
      hipLeft: project(selectedBody.body?.left_hip),
      hipRight: project(selectedBody.body?.right_hip),
      chest: project(selectedBody.body?.chest),
      pelvis: project(selectedBody.body?.pelvis),
      hands: project(selectedBody.body?.hands),
      clubhead: project(selectedClub.clubhead_m),
      grip: project(selectedClub.grip_center_m),
      selectedFrame,
      kineticsValid: selectedFrame <= 64,
    };
  }, [sequenceFrames, clubFrames, projectionView, selectedP]);

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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
          alignItems: "start",
        }}
      >
        <div
          style={{
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(240,190,60,0.30)",
            background: "#05070b",
          }}
        >
          <div
            style={{
              padding: "8px 10px",
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            <span>Your swing • P{selectedP}</span>
            <span style={{ opacity: 0.55 }}>
              {playerCheckpoint ? `F${playerCheckpoint.frame}` : "Waiting for frame"}
            </span>
          </div>
          {playerCheckpoint ? (
            <img
              src={playerCheckpoint.imageUrl || playerCheckpoint.thumbUrl}
              alt={`Player swing ${playerCheckpoint.label}`}
              style={{
                width: "100%",
                display: "block",
                aspectRatio: "4 / 3",
                objectFit: "contain",
                background: "#050505",
              }}
            />
          ) : (
            <div
              style={{
                aspectRatio: "4 / 3",
                display: "grid",
                placeItems: "center",
                padding: 20,
                textAlign: "center",
                fontSize: 12,
                opacity: 0.55,
              }}
            >
              Run analysis to populate the player P-frame.
            </div>
          )}
        </div>

        <div
          style={{
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(0,210,255,0.28)",
            background: "#05070b",
          }}
        >
          <div
            style={{
              padding: "8px 10px",
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            <span>VCA model • P{selectedP}</span>
            <span style={{ opacity: 0.55 }}>
              {premiumCheckpoint ? "V435 premium" : "V309 motion"}
            </span>
          </div>

          {premiumCheckpoint && (
            <img
              src={premiumCheckpoint}
              alt={`VCA commercial 3D model P${selectedP}`}
              style={{
                width: "100%",
                display: "block",
                aspectRatio: "4 / 3",
                objectFit: "contain",
                background: "#050505",
              }}
            />
          )}

          <div style={{ padding: premiumCheckpoint ? "8px 8px 0" : 0 }}>
            {premiumCheckpoint && (
              <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 900, opacity: 0.5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Animated reference
              </div>
            )}
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
                aspectRatio: premiumCheckpoint ? "8 / 3" : "4 / 3",
                objectFit: "contain",
                borderRadius: premiumCheckpoint ? 10 : 0,
                background: "#050505",
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.035)",
          fontSize: 12,
          lineHeight: 1.45,
        }}
      >
        <b>Compare P{selectedP}:</b> body position, hand path, shaft orientation, pressure/rotation sequence and club delivery. This is the first production layer of the player-vs-model biomechanics viewer.
      </div>

      <div
        style={{
          marginTop: 12,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "radial-gradient(circle at 50% 45%, rgba(65,85,105,0.24), rgba(4,7,11,0.98) 72%)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase" }}>
              3D Motion Map • P{selectedP}
            </div>
            <div style={{ marginTop: 2, fontSize: 11, opacity: 0.58 }}>
              V197/V200 measured sequence • hand / grip / clubhead trajectories
            </div>
          </div>

          <div style={{ display: "flex", gap: 7 }}>
            <button
              type="button"
              onClick={() => setProjectionView("face")}
              style={pill(projectionView === "face")}
            >
              Face On
            </button>
            <button
              type="button"
              onClick={() => setProjectionView("dtl")}
              style={pill(projectionView === "dtl")}
            >
              DTL
            </button>
          </div>
        </div>

        {motionMap ? (
          <div style={{ position: "relative", aspectRatio: "16 / 7", minHeight: 260 }}>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              aria-label={`VCA 3D motion map ${projectionView} P${selectedP}`}
            >
              <line x1="8" y1="92" x2="92" y2="92" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
              <line x1="50" y1="8" x2="50" y2="92" stroke="rgba(255,255,255,0.06)" strokeWidth="0.35" />

              <path
                d={motionMap.clubPath}
                fill="none"
                stroke="rgba(223,79,255,0.82)"
                strokeWidth="1.55"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={motionMap.gripPath}
                fill="none"
                stroke="rgba(250,182,70,0.88)"
                strokeWidth="1.15"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={motionMap.handPath}
                fill="none"
                stroke="rgba(70,196,255,0.92)"
                strokeWidth="1.15"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {motionMap.shoulderLeft && motionMap.shoulderRight && (
                <line
                  x1={motionMap.shoulderLeft[0]}
                  y1={motionMap.shoulderLeft[1]}
                  x2={motionMap.shoulderRight[0]}
                  y2={motionMap.shoulderRight[1]}
                  stroke="rgba(95,205,255,0.95)"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                />
              )}

              {motionMap.hipLeft && motionMap.hipRight && (
                <line
                  x1={motionMap.hipLeft[0]}
                  y1={motionMap.hipLeft[1]}
                  x2={motionMap.hipRight[0]}
                  y2={motionMap.hipRight[1]}
                  stroke="rgba(110,255,170,0.92)"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                />
              )}

              {motionMap.chest && motionMap.pelvis && (
                <line
                  x1={motionMap.chest[0]}
                  y1={motionMap.chest[1]}
                  x2={motionMap.pelvis[0]}
                  y2={motionMap.pelvis[1]}
                  stroke="rgba(255,255,255,0.72)"
                  strokeWidth="0.8"
                  strokeDasharray="2 1.5"
                />
              )}

              {motionMap.hands && (
                <circle cx={motionMap.hands[0]} cy={motionMap.hands[1]} r="1.6" fill="rgb(70,196,255)" />
              )}
              {motionMap.grip && (
                <circle cx={motionMap.grip[0]} cy={motionMap.grip[1]} r="1.45" fill="rgb(250,182,70)" />
              )}
              {motionMap.clubhead && (
                <circle cx={motionMap.clubhead[0]} cy={motionMap.clubhead[1]} r="1.8" fill="rgb(223,79,255)" />
              )}
            </svg>

            <div
              style={{
                position: "absolute",
                left: 12,
                bottom: 10,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 0.2,
              }}
            >
              <span>● Hand path</span>
              <span style={{ opacity: 0.85 }}>● Grip path</span>
              <span style={{ opacity: 0.85 }}>● Clubhead path</span>
              <span style={{ opacity: 0.7 }}>Shoulders / pelvis</span>
            </div>

            <div
              style={{
                position: "absolute",
                right: 12,
                bottom: 10,
                fontSize: 10,
                opacity: 0.58,
                textAlign: "right",
              }}
            >
              F{motionMap.selectedFrame}
              <br />
              {motionMap.kineticsValid ? "Precision motion range" : "P10 context only"}
            </div>
          </div>
        ) : (
          <div style={{ minHeight: 260, display: "grid", placeItems: "center", fontSize: 12, opacity: 0.55 }}>
            Loading 3D motion data…
          </div>
        )}
      </div>

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
