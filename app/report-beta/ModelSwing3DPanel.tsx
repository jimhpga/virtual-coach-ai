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
  relative_time_s?: number;
  body: Record<string, Vec3>;
};
type ClubFrame = {
  frame: number;
  relative_time_s?: number;
  grip_center_m: Vec3;
  clubhead_m: Vec3;
};
type ProjectionView = "face" | "dtl";
type PlayerPoseLm = { x: number; y: number; z?: number; v?: number };
type PlayerPoseFrame = {
  frame: number;
  t?: number;
  ok?: boolean;
  landmarks: PlayerPoseLm[];
};
type PlayerPoseJson = {
  frames?: PlayerPoseFrame[];
};

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

type MetricPoint = { frame: number; value: number };

function metricPath(points: MetricPoint[], maxFrame = 64) {
  if (!points.length) return "";
  const maxValue = Math.max(1, ...points.map((p) => Math.abs(p.value)));
  return points
    .map((p, i) => {
      const x = 4 + ((p.frame - 1) / Math.max(1, maxFrame - 1)) * 92;
      const y = 38 - (Math.abs(p.value) / maxValue) * 32;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function nearestMetric(points: MetricPoint[], frame: number) {
  if (!points.length) return 0;
  return points.reduce((best, p) =>
    Math.abs(p.frame - frame) < Math.abs(best.frame - frame) ? p : best
  ).value;
}

export default function ModelSwing3DPanel({ playerPose }: { playerPose?: PlayerPoseJson | null }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mode, setMode] = useState<Mode>("slow");
  const [selectedP, setSelectedP] = useState<number>(7);
  const [playerFrames, setPlayerFrames] = useState<PlayerPFrame[]>([]);
  const [sequenceFrames, setSequenceFrames] = useState<SequenceFrame[]>([]);
  const [clubFrames, setClubFrames] = useState<ClubFrame[]>([]);
  const [projectionView, setProjectionView] = useState<ProjectionView>("face");
  const premiumCheckpoint = PREMIUM_CHECKPOINTS[selectedP];
  const playerCheckpoint = playerFrames.find((f) => f.p === selectedP) ?? null;

  const playerOverlay = useMemo(() => {
    const frames = (playerPose?.frames ?? []).filter(
      (f) => Array.isArray(f?.landmarks) && f.landmarks.length >= 29
    );
    if (!frames.length || !playerCheckpoint) return null;

    const selectedPose = frames.reduce((best, f) =>
      Math.abs(f.frame - playerCheckpoint.frame) < Math.abs(best.frame - playerCheckpoint.frame)
        ? f
        : best
    );

    const lm = (idx: number) => {
      const p = selectedPose.landmarks?.[idx];
      if (!p || typeof p.x !== "number" || typeof p.y !== "number") return null;
      if (typeof p.v === "number" && p.v < 0.25) return null;
      return p;
    };

    const edges: Array<[number, number]> = [
      [11, 12],
      [11, 13],
      [13, 15],
      [12, 14],
      [14, 16],
      [11, 23],
      [12, 24],
      [23, 24],
      [23, 25],
      [25, 27],
      [24, 26],
      [26, 28],
    ];

    const handTrail = frames
      .filter((f) => f.frame <= selectedPose.frame)
      .map((f) => {
        const l = f.landmarks?.[15];
        const r = f.landmarks?.[16];
        if (!l || !r) return null;
        if (
          typeof l.x !== "number" ||
          typeof l.y !== "number" ||
          typeof r.x !== "number" ||
          typeof r.y !== "number"
        ) {
          return null;
        }
        return {
          x: ((l.x + r.x) / 2) * 100,
          y: ((l.y + r.y) / 2) * 100,
        };
      })
      .filter((p): p is { x: number; y: number } => Boolean(p));

    const handPath = handTrail
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(" ");

    return {
      selectedPose,
      edges,
      lm,
      handPath,
      leftWrist: lm(15),
      rightWrist: lm(16),
      leftShoulder: lm(11),
      rightShoulder: lm(12),
      leftHip: lm(23),
      rightHip: lm(24),
    };
  }, [playerPose, playerCheckpoint]);

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

    const p1Body =
      sequenceFrames.find((f) => f.frame === 1)?.body ??
      sequenceFrames[0]?.body ??
      {};

    const angleDeg = (a?: Vec3, b?: Vec3) => {
      if (!a || !b) return 0;
      return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    };

    const wrapDeg = (v: number) => {
      let out = v;
      while (out > 180) out -= 360;
      while (out < -180) out += 360;
      return out;
    };

    const shoulderTurn = wrapDeg(
      angleDeg(selectedBody.body?.left_shoulder, selectedBody.body?.right_shoulder) -
        angleDeg(p1Body?.left_shoulder, p1Body?.right_shoulder)
    );

    const pelvisTurn = wrapDeg(
      angleDeg(selectedBody.body?.left_hip, selectedBody.body?.right_hip) -
        angleDeg(p1Body?.left_hip, p1Body?.right_hip)
    );

    const separation = wrapDeg(shoulderTurn - pelvisTurn);
    const handAbovePelvisCm =
      selectedBody.body?.hands && selectedBody.body?.pelvis
        ? (selectedBody.body.hands[2] - selectedBody.body.pelvis[2]) * 100
        : 0;
    const clubheadHeightCm = selectedClub.clubhead_m?.[2]
      ? selectedClub.clubhead_m[2] * 100
      : 0;

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
      shoulderTurn,
      pelvisTurn,
      separation,
      handAbovePelvisCm,
      clubheadHeightCm,
    };
  }, [sequenceFrames, clubFrames, projectionView, selectedP]);

  const visualDeltas = useMemo(() => {
    if (
      !playerOverlay ||
      !motionMap ||
      !playerOverlay.leftShoulder ||
      !playerOverlay.rightShoulder ||
      !playerOverlay.leftHip ||
      !playerOverlay.rightHip ||
      !motionMap.shoulderLeft ||
      !motionMap.shoulderRight ||
      !motionMap.hipLeft ||
      !motionMap.hipRight ||
      !motionMap.hands ||
      !motionMap.pelvis
    ) {
      return null;
    }

    const lineTilt = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      let deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      while (deg > 90) deg -= 180;
      while (deg < -90) deg += 180;
      return deg;
    };

    const tupleTilt = (a: [number, number], b: [number, number]) =>
      lineTilt({ x: a[0], y: a[1] }, { x: b[0], y: b[1] });

    const playerHands = (() => {
      if (!playerOverlay.leftWrist || !playerOverlay.rightWrist) return null;
      return {
        x: ((playerOverlay.leftWrist.x + playerOverlay.rightWrist.x) / 2) * 100,
        y: ((playerOverlay.leftWrist.y + playerOverlay.rightWrist.y) / 2) * 100,
      };
    })();

    if (!playerHands) return null;

    const playerPelvis = {
      x: ((playerOverlay.leftHip.x + playerOverlay.rightHip.x) / 2) * 100,
      y: ((playerOverlay.leftHip.y + playerOverlay.rightHip.y) / 2) * 100,
    };

    const playerShoulderTilt = lineTilt(
      { x: playerOverlay.leftShoulder.x * 100, y: playerOverlay.leftShoulder.y * 100 },
      { x: playerOverlay.rightShoulder.x * 100, y: playerOverlay.rightShoulder.y * 100 }
    );
    const playerPelvisTilt = lineTilt(
      { x: playerOverlay.leftHip.x * 100, y: playerOverlay.leftHip.y * 100 },
      { x: playerOverlay.rightHip.x * 100, y: playerOverlay.rightHip.y * 100 }
    );

    const modelShoulderTilt = tupleTilt(motionMap.shoulderLeft, motionMap.shoulderRight);
    const modelPelvisTilt = tupleTilt(motionMap.hipLeft, motionMap.hipRight);

    const playerHandHeight = playerPelvis.y - playerHands.y;
    const modelHandHeight = motionMap.pelvis[1] - motionMap.hands[1];
    const playerHandLateral = playerHands.x - playerPelvis.x;
    const modelHandLateral = motionMap.hands[0] - motionMap.pelvis[0];

    return {
      rows: [
        {
          label: "Shoulder line",
          player: playerShoulderTilt,
          model: modelShoulderTilt,
          delta: playerShoulderTilt - modelShoulderTilt,
          unit: "°",
        },
        {
          label: "Pelvis line",
          player: playerPelvisTilt,
          model: modelPelvisTilt,
          delta: playerPelvisTilt - modelPelvisTilt,
          unit: "°",
        },
        {
          label: "Hand height",
          player: playerHandHeight,
          model: modelHandHeight,
          delta: playerHandHeight - modelHandHeight,
          unit: "%",
        },
        {
          label: "Hand lateral",
          player: playerHandLateral,
          model: modelHandLateral,
          delta: playerHandLateral - modelHandLateral,
          unit: "%",
        },
      ],
    };
  }, [playerOverlay, motionMap]);

  const kinematicGraphs = useMemo(() => {
    const seq = [...sequenceFrames].filter((f) => f.frame <= 64).sort((a, b) => a.frame - b.frame);
    const club = [...clubFrames].filter((f) => f.frame <= 64).sort((a, b) => a.frame - b.frame);
    if (seq.length < 2 || club.length < 2) return null;

    const dist = (a: Vec3, b: Vec3) =>
      Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

    const dtFor = (cur: { relative_time_s?: number }, prev: { relative_time_s?: number }) => {
      const dt =
        typeof cur.relative_time_s === "number" &&
        typeof prev.relative_time_s === "number"
          ? cur.relative_time_s - prev.relative_time_s
          : 1 / 60;
      return Math.max(1 / 240, dt);
    };

    const speedSeries = <T extends { frame: number; relative_time_s?: number }>(
      frames: T[],
      pick: (f: T) => Vec3,
      multiplier = 1
    ): MetricPoint[] =>
      frames.slice(1).map((f, i) => {
        const prev = frames[i];
        return {
          frame: f.frame,
          value: (dist(pick(f), pick(prev)) / dtFor(f, prev)) * multiplier,
        };
      });

    const lineAngle = (a?: Vec3, b?: Vec3) => {
      if (!a || !b) return 0;
      return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    };

    const angleDelta = (a: number, b: number) => {
      let d = a - b;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      return d;
    };

    const rotationSeries = (
      frames: SequenceFrame[],
      leftKey: string,
      rightKey: string
    ): MetricPoint[] =>
      frames.slice(1).map((f, i) => {
        const prev = frames[i];
        const curA = lineAngle(f.body?.[leftKey], f.body?.[rightKey]);
        const prevA = lineAngle(prev.body?.[leftKey], prev.body?.[rightKey]);
        return {
          frame: f.frame,
          value: Math.abs(angleDelta(curA, prevA)) / dtFor(f, prev),
        };
      });

    const clubSpeed = speedSeries(club, (f) => f.clubhead_m, 2.23694);
    const handSpeed = speedSeries(seq, (f) => f.body.hands, 2.23694);
    const pelvisSpeed = rotationSeries(seq, "left_hip", "right_hip");
    const torsoSpeed = rotationSeries(seq, "left_shoulder", "right_shoulder");
    const selectedFrame = Math.min(CHECKPOINT_FRAMES[selectedP] ?? 1, 64);

    return {
      selectedFrame,
      clubSpeed,
      handSpeed,
      pelvisSpeed,
      torsoSpeed,
      clubSpeedNow: nearestMetric(clubSpeed, selectedFrame),
      handSpeedNow: nearestMetric(handSpeed, selectedFrame),
      pelvisSpeedNow: nearestMetric(pelvisSpeed, selectedFrame),
      torsoSpeedNow: nearestMetric(torsoSpeed, selectedFrame),
    };
  }, [sequenceFrames, clubFrames, selectedP]);

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
            <div style={{ position: "relative", background: "#050505" }}>
              <img
                src={playerCheckpoint.imageUrl || playerCheckpoint.thumbUrl}
                alt={`Player swing ${playerCheckpoint.label}`}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  background: "#050505",
                }}
              />
              {playerOverlay && (
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                  }}
                  aria-label={`Player pose overlay P${selectedP}`}
                >
                  {playerOverlay.handPath && (
                    <path
                      d={playerOverlay.handPath}
                      fill="none"
                      stroke="rgba(255,170,45,0.88)"
                      strokeWidth="0.85"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {playerOverlay.edges.map(([aIdx, bIdx], i) => {
                    const a = playerOverlay.lm(aIdx);
                    const b = playerOverlay.lm(bIdx);
                    if (!a || !b) return null;
                    return (
                      <line
                        key={`${aIdx}-${bIdx}-${i}`}
                        x1={a.x * 100}
                        y1={a.y * 100}
                        x2={b.x * 100}
                        y2={b.y * 100}
                        stroke={
                          aIdx === 11 && bIdx === 12
                            ? "rgba(255,210,65,0.98)"
                            : aIdx === 23 && bIdx === 24
                              ? "rgba(110,255,170,0.95)"
                              : "rgba(255,190,60,0.86)"
                        }
                        strokeWidth={aIdx === 11 || aIdx === 23 ? "0.75" : "0.55"}
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {[11,12,13,14,15,16,23,24,25,26,27,28].map((idx) => {
                    const pt = playerOverlay.lm(idx);
                    if (!pt) return null;
                    return (
                      <circle
                        key={idx}
                        cx={pt.x * 100}
                        cy={pt.y * 100}
                        r={idx === 15 || idx === 16 ? "0.95" : "0.62"}
                        fill={idx === 15 || idx === 16 ? "rgb(255,170,45)" : "rgba(255,235,160,0.95)"}
                      />
                    );
                  })}
                </svg>
              )}

              {playerOverlay && (
                <div
                  style={{
                    position: "absolute",
                    left: 8,
                    bottom: 8,
                    padding: "5px 7px",
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.62)",
                    border: "1px solid rgba(255,190,60,0.28)",
                    fontSize: 9,
                    fontWeight: 900,
                    letterSpacing: 0.35,
                    textTransform: "uppercase",
                  }}
                >
                  Pose tracked • hand path
                </div>
              )}
            </div>
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

      {visualDeltas && (
        <div
          style={{
            marginTop: 10,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.035)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "9px 11px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.45 }}>
              Visual Geometry Delta • P{selectedP}
            </div>
            <div style={{ fontSize: 10, opacity: 0.52 }}>
              Camera-space estimate • match player camera to {projectionView === "face" ? "Face On" : "DTL"} for valid comparison
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.25fr repeat(3, minmax(0, 1fr))",
              fontSize: 11,
            }}
          >
            {["Metric", "Player", "Model", "Δ"].map((h) => (
              <div
                key={h}
                style={{
                  padding: "7px 10px",
                  fontWeight: 900,
                  opacity: 0.58,
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {h}
              </div>
            ))}

            {visualDeltas.rows.flatMap((row) => {
              const deltaAbs = Math.abs(row.delta);
              const deltaTone =
                deltaAbs <= (row.unit === "°" ? 3 : 4)
                  ? "rgba(110,255,170,0.95)"
                  : deltaAbs <= (row.unit === "°" ? 7 : 8)
                    ? "rgba(255,210,90,0.95)"
                    : "rgba(255,125,125,0.95)";

              return [
                <div key={`${row.label}-label`} style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontWeight: 800 }}>
                  {row.label}
                </div>,
                <div key={`${row.label}-player`} style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {row.player.toFixed(1)}{row.unit}
                </div>,
                <div key={`${row.label}-model`} style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {row.model.toFixed(1)}{row.unit}
                </div>,
                <div key={`${row.label}-delta`} style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)", color: deltaTone, fontWeight: 900 }}>
                  {row.delta >= 0 ? "+" : ""}{row.delta.toFixed(1)}{row.unit}
                </div>,
              ];
            })}
          </div>
        </div>
      )}

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

        {motionMap && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: 8,
              padding: "10px 12px 12px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {[
              ["Shoulder turn", `${motionMap.shoulderTurn.toFixed(1)}°`],
              ["Pelvis turn", `${motionMap.pelvisTurn.toFixed(1)}°`],
              ["Separation", `${Math.abs(motionMap.separation).toFixed(1)}°`],
              ["Hands vs pelvis", `${motionMap.handAbovePelvisCm.toFixed(0)} cm`],
              ["Clubhead height", `${motionMap.clubheadHeightCm.toFixed(0)} cm`],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  minWidth: 0,
                  padding: "9px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.035)",
                }}
              >
                <div style={{ fontSize: 10, opacity: 0.58, fontWeight: 800 }}>{label}</div>
                <div style={{ marginTop: 3, fontSize: 16, fontWeight: 900 }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {kinematicGraphs && (
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {[
            ["Club speed", kinematicGraphs.clubSpeed, kinematicGraphs.clubSpeedNow, "mph"],
            ["Hand speed", kinematicGraphs.handSpeed, kinematicGraphs.handSpeedNow, "mph"],
            ["Pelvis speed", kinematicGraphs.pelvisSpeed, kinematicGraphs.pelvisSpeedNow, "°/s"],
            ["Torso speed", kinematicGraphs.torsoSpeed, kinematicGraphs.torsoSpeedNow, "°/s"],
          ].map(([label, points, current, unit]) => {
            const series = points as MetricPoint[];
            const markerX = 4 + ((kinematicGraphs.selectedFrame - 1) / 63) * 92;
            return (
              <div
                key={label as string}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.28)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "9px 10px 4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 900, opacity: 0.68 }}>
                    {label as string}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 900 }}>
                    {(current as number).toFixed((unit as string) === "mph" ? 1 : 0)} {unit as string}
                  </span>
                </div>
                <svg viewBox="0 0 100 42" style={{ width: "100%", height: 82, display: "block" }}>
                  <line x1="4" y1="38" x2="96" y2="38" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5" />
                  <path
                    d={metricPath(series)}
                    fill="none"
                    stroke="rgba(100,190,255,0.92)"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1={markerX}
                    y1="4"
                    x2={markerX}
                    y2="38"
                    stroke="rgba(255,255,255,0.72)"
                    strokeWidth="0.8"
                    strokeDasharray="2 1.5"
                  />
                </svg>
                <div
                  style={{
                    padding: "0 10px 8px",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 9,
                    opacity: 0.45,
                  }}
                >
                  <span>P1</span>
                  <span>P{selectedP}</span>
                  <span>P9</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
