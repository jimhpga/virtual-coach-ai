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
type PlayerPoseLm = {
  x: number;
  y: number;
  z?: number;
  v?: number;
  visibility?: number;
};
type PlayerPoseFrame = {
  frame: number;
  t?: number;
  ok?: boolean;
  landmarks: PlayerPoseLm[];
};
type PlayerPoseJson = {
  frames?: PlayerPoseFrame[];
};

type PlayerShaftPhase = {
  phase?: string;
  frame?: number;
  shaftDeg?: number | null;
  conf?: number | null;
  shaftSource?: string | null;
  shaftLine?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null;
  imageSize?: {
    width: number;
    height: number;
  } | null;
  why?: string | null;
};

type PlayerShaftBlock = {
  status?: string;
  confidenceMin?: number | null;
  P5?: PlayerShaftPhase | null;
  P6?: PlayerShaftPhase | null;
  P7?: PlayerShaftPhase | null;
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

const FPS = 30;

const PREMIUM_CHECKPOINTS: Partial<Record<number, string>> = {
  1: "/images/avatar/tight/p1.png",
  4: "/images/avatar/tight/p4.png",
  7: "/images/avatar/tight/p7.png",
  10: "/images/avatar/tight/p10.png",
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

export default function ModelSwing3DPanel({
  playerPose,
  playerShaft,
}: {
  playerPose?: PlayerPoseJson | null;
  playerShaft?: PlayerShaftBlock | null;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mode, setMode] = useState<Mode>("slow");
  const [selectedP, setSelectedP] = useState<number>(7);
  const [cursorFrame, setCursorFrame] = useState<number>(CHECKPOINT_FRAMES[7]);
  const [playerFrames, setPlayerFrames] = useState<PlayerPFrame[]>([]);
  const [sequenceFrames, setSequenceFrames] = useState<SequenceFrame[]>([]);
  const [clubFrames, setClubFrames] = useState<ClubFrame[]>([]);
  const [projectionView, setProjectionView] = useState<ProjectionView>("face");
  const [layers, setLayers] = useState({
    body: true,
    club: true,
    paths: true,
    volumes: true,
  });
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

    const vis = (p?: PlayerPoseLm | null) => {
      if (!p) return 0;
      if (typeof p.v === "number") return p.v;
      if (typeof p.visibility === "number") return p.visibility;
      return 1;
    };

    const trailStartFrame = selectedPose.frame - 16;

    const rawHandTrail = [...frames]
      .filter(
        (f) =>
          f.frame <= selectedPose.frame &&
          f.frame >= trailStartFrame
      )
      .sort((a, b) => a.frame - b.frame)
      .map((f) => {
        const l = f.landmarks?.[15];
        const r = f.landmarks?.[16];
        if (!l || !r) return null;

        const lv = vis(l);
        const rv = vis(r);
        const lOk = Number.isFinite(l.x) && Number.isFinite(l.y) && lv >= 0.2;
        const rOk = Number.isFinite(r.x) && Number.isFinite(r.y) && rv >= 0.2;

        if (!lOk && !rOk) return null;

        if (lOk && rOk) {
          const sep = Math.hypot(l.x - r.x, l.y - r.y);

          // Golf hands should remain close together. Large separation is usually
          // a wrist swap/occlusion error, not real grip motion.
          if (sep <= 0.18) {
            const wl = Math.max(0.05, lv);
            const wr = Math.max(0.05, rv);
            const total = wl + wr;
            return {
              frame: f.frame,
              x: (l.x * wl + r.x * wr) / total,
              y: (l.y * wl + r.y * wr) / total,
              quality: Math.min(1, (lv + rv) / 2),
            };
          }

          // If one wrist is clearly more trustworthy, keep the stronger one.
          if (Math.abs(lv - rv) >= 0.28) {
            const best = lv > rv ? l : r;
            return {
              frame: f.frame,
              x: best.x,
              y: best.y,
              quality: Math.max(lv, rv) * 0.82,
            };
          }

          return null;
        }

        const best = lOk ? l : r;
        const q = lOk ? lv : rv;
        if (!best || q < 0.45) return null;

        return {
          frame: f.frame,
          x: best.x,
          y: best.y,
          quality: q * 0.78,
        };
      })
      .filter(
        (p): p is { frame: number; x: number; y: number; quality: number } =>
          Boolean(p)
      );

    const deJumped: typeof rawHandTrail = [];
    for (const p of rawHandTrail) {
      const prev = deJumped[deJumped.length - 1];
      if (!prev) {
        deJumped.push(p);
        continue;
      }

      const frameGap = Math.max(1, p.frame - prev.frame);
      const jump = Math.hypot(p.x - prev.x, p.y - prev.y);
      const allowed = 0.09 + Math.min(0.10, frameGap * 0.018);
      const isSelectedPoint = p.frame === selectedPose.frame;

      if (jump <= allowed || isSelectedPoint) {
        deJumped.push(p);
      }
    }

    // Always keep the latest trustworthy hand location so the trail terminates
    // at the selected P-position rather than floating behind the golfer.
    const latestRaw = rawHandTrail[rawHandTrail.length - 1];
    if (
      latestRaw &&
      !deJumped.some((p) => p.frame === latestRaw.frame)
    ) {
      deJumped.push(latestRaw);
    }

    const handTrail = deJumped.map((p, i, arr) => {
      const a = arr[Math.max(0, i - 1)];
      const b = p;
      const c = arr[Math.min(arr.length - 1, i + 1)];
      return {
        x: ((a.x + b.x + c.x) / 3) * 100,
        y: ((a.y + b.y + c.y) / 3) * 100,
      };
    });

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

  const playerShaftOverlay = useMemo(() => {
    if (!playerShaft || selectedP < 5 || selectedP > 7) return null;

    const phase =
      selectedP === 5
        ? playerShaft.P5
        : selectedP === 6
          ? playerShaft.P6
          : playerShaft.P7;

    if (!phase) return null;

    const conf = typeof phase.conf === "number" ? phase.conf : 0;
    const source = phase.shaftSource ?? "";
    const line = phase.shaftLine ?? null;
    const size = phase.imageSize ?? null;
    const measured =
      conf > 0 &&
      source !== "unavailable" &&
      Boolean(line) &&
      Boolean(size?.width) &&
      Boolean(size?.height);

    if (!measured || !line || !size) {
      return {
        available: false,
        confidence: conf,
        source,
        why: phase.why ?? "Shaft tracking unavailable.",
      };
    }

    return {
      available: true,
      confidence: conf,
      source,
      why: phase.why ?? "",
      line: {
        x1: (line.x1 / size.width) * 100,
        y1: (line.y1 / size.height) * 100,
        x2: (line.x2 / size.width) * 100,
        y2: (line.y2 / size.height) * 100,
      },
    };
  }, [playerShaft, selectedP]);

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
    () => `/vca-3d/v200/${projectionView}.mp4`,
    [projectionView]
  );

  const frameToVideoTime = (frame: number) =>
    Math.max(0, frame - 1) / FPS;

  const physicsTimeForFrame = (frame: number) => {
    if (!sequenceFrames.length) {
      return Math.max(0, frame - 1) / 60;
    }
    const nearest = sequenceFrames.reduce((best, f) =>
      Math.abs(f.frame - frame) < Math.abs(best.frame - frame) ? f : best
    );
    return typeof nearest.relative_time_s === "number"
      ? nearest.relative_time_s
      : Math.max(0, frame - 1) / 60;
  };

  const checkpointTime = (p: number) =>
    frameToVideoTime(CHECKPOINT_FRAMES[p] ?? 1);

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

    const bodyKeys = [
      "head",
      "left_shoulder",
      "right_shoulder",
      "left_elbow",
      "right_elbow",
      "left_wrist",
      "right_wrist",
      "left_hip",
      "right_hip",
      "left_knee",
      "right_knee",
      "left_ankle",
      "right_ankle",
      "chest",
      "pelvis",
      "hands",
    ];

    const bodyPoints = Object.fromEntries(
      bodyKeys.map((key) => [key, project(selectedBody.body?.[key])])
    ) as Record<string, [number, number] | null>;

    const handProjected = bodyTrail
      .map((f) => project(f.body?.hands))
      .filter((p): p is [number, number] => Boolean(p));
    const clubProjected = clubTrail
      .map((f) => project(f.clubhead_m))
      .filter((p): p is [number, number] => Boolean(p));
    const gripProjected = clubTrail
      .map((f) => project(f.grip_center_m))
      .filter((p): p is [number, number] => Boolean(p));

    const envelope = (pts: Array<[number, number]>) => {
      if (pts.length < 2) return null;
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return {
        cx: (minX + maxX) / 2,
        cy: (minY + maxY) / 2,
        rx: Math.max(2, (maxX - minX) / 2 + 2.5),
        ry: Math.max(2, (maxY - minY) / 2 + 2.5),
      };
    };

    return {
      handPath: pathFrom(handProjected),
      clubPath: pathFrom(clubProjected),
      gripPath: pathFrom(gripProjected),
      handEnvelope: envelope(handProjected),
      clubEnvelope: envelope(clubProjected),
      shoulderLeft: project(selectedBody.body?.left_shoulder),
      shoulderRight: project(selectedBody.body?.right_shoulder),
      hipLeft: project(selectedBody.body?.left_hip),
      hipRight: project(selectedBody.body?.right_hip),
      chest: project(selectedBody.body?.chest),
      pelvis: project(selectedBody.body?.pelvis),
      hands: project(selectedBody.body?.hands),
      clubhead: project(selectedClub.clubhead_m),
      grip: project(selectedClub.grip_center_m),
      bodyPoints,
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

    const rows = [
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
    ];

    if (
      playerShaftOverlay?.available &&
      playerShaftOverlay.line &&
      motionMap.grip &&
      motionMap.clubhead
    ) {
      const playerShaftTilt = lineTilt(
        { x: playerShaftOverlay.line.x1, y: playerShaftOverlay.line.y1 },
        { x: playerShaftOverlay.line.x2, y: playerShaftOverlay.line.y2 }
      );
      const modelShaftTilt = tupleTilt(motionMap.grip, motionMap.clubhead);

      let shaftDelta = playerShaftTilt - modelShaftTilt;
      while (shaftDelta > 90) shaftDelta -= 180;
      while (shaftDelta < -90) shaftDelta += 180;

      rows.push({
        label: "Shaft angle",
        player: playerShaftTilt,
        model: modelShaftTilt,
        delta: shaftDelta,
        unit: "°",
      });
    }

    return { rows };
  }, [playerOverlay, playerShaftOverlay, motionMap]);

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
    const selectedFrame = Math.min(cursorFrame, 64);

    const smoothSeries = (points: MetricPoint[], radius = 2): MetricPoint[] =>
      points.map((p, i) => {
        const lo = Math.max(0, i - radius);
        const hi = Math.min(points.length, i + radius + 1);
        const slice = points.slice(lo, hi);
        return {
          frame: p.frame,
          value: slice.reduce((sum, q) => sum + q.value, 0) / Math.max(1, slice.length),
        };
      });

    const firstDominantPeak = (points: MetricPoint[]) => {
      const windowed = smoothSeries(points).filter(
        (p) => p.frame >= CHECKPOINT_FRAMES[4] && p.frame <= CHECKPOINT_FRAMES[8]
      );
      if (!windowed.length) return null;

      const maxValue = Math.max(...windowed.map((p) => p.value));
      const threshold = maxValue * 0.55;

      for (let i = 1; i < windowed.length - 1; i += 1) {
        const prev = windowed[i - 1];
        const cur = windowed[i];
        const next = windowed[i + 1];
        if (
          cur.value >= threshold &&
          cur.value >= prev.value &&
          cur.value >= next.value
        ) {
          return cur;
        }
      }

      return windowed.reduce((best, p) => (p.value > best.value ? p : best));
    };

    const timeForFrame = (frame: number) => {
      const nearest = seq.reduce((best, f) =>
        Math.abs(f.frame - frame) < Math.abs(best.frame - frame) ? f : best
      );
      return typeof nearest.relative_time_s === "number"
        ? nearest.relative_time_s
        : (frame - 1) / 60;
    };

    const peakDefs = [
      { label: "Pelvis", unit: "°/s", point: firstDominantPeak(pelvisSpeed) },
      { label: "Torso", unit: "°/s", point: firstDominantPeak(torsoSpeed) },
      { label: "Hands", unit: "mph", point: firstDominantPeak(handSpeed) },
      { label: "Club", unit: "mph", point: firstDominantPeak(clubSpeed) },
    ];

    const sequencePeaks = peakDefs
      .filter((x): x is { label: string; unit: string; point: MetricPoint } => Boolean(x.point))
      .map((x) => ({
        label: x.label,
        unit: x.unit,
        frame: x.point.frame,
        value: x.point.value,
        time: timeForFrame(x.point.frame),
      }));

    const sequenceGapsMs = sequencePeaks.slice(1).map((peak, i) =>
      Math.round((peak.time - sequencePeaks[i].time) * 1000)
    );

    const sequenceInOrder =
      sequencePeaks.length === 4 &&
      sequencePeaks.every((peak, i) => i === 0 || peak.time >= sequencePeaks[i - 1].time);

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
      sequencePeaks,
      sequenceGapsMs,
      sequenceInOrder,
    };
  }, [sequenceFrames, clubFrames, cursorFrame]);

  const jumpTo = (p: number) => {
    const frame = CHECKPOINT_FRAMES[p] ?? 1;
    setSelectedP(p);
    setCursorFrame(frame);
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = checkpointTime(p);
    v.pause();
  };

  const setPlaybackMode = (next: Mode) => {
    setMode(next);
    const v = videoRef.current;
    if (v) {
      v.playbackRate = next === "slow" ? 0.5 : 2;
    }
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
            {projectionView === "face" ? "Face On" : "Down the Line"} synchronized
          </div>
          <div style={{ marginTop: 3, fontSize: 11, opacity: 0.64 }}>
            Locked V200 reference • 30 fps state-native • P1–P10
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
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
                  {layers.paths && playerOverlay.handPath && (
                    <path
                      d={playerOverlay.handPath}
                      fill="none"
                      stroke="rgba(255,170,45,0.88)"
                      strokeWidth="0.85"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {layers.club && playerShaftOverlay?.available && playerShaftOverlay.line && (
                    <line
                      x1={playerShaftOverlay.line.x1}
                      y1={playerShaftOverlay.line.y1}
                      x2={playerShaftOverlay.line.x2}
                      y2={playerShaftOverlay.line.y2}
                      stroke="rgba(70,196,255,0.98)"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  )}

                  {layers.body && playerOverlay.edges.map(([aIdx, bIdx], i) => {
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

                  {layers.body && [11,12,13,14,15,16,23,24,25,26,27,28].map((idx) => {
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

              {selectedP >= 5 && selectedP <= 7 && playerShaftOverlay && (
                <div
                  title={playerShaftOverlay.why}
                  style={{
                    position: "absolute",
                    right: 8,
                    bottom: 8,
                    padding: "5px 7px",
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.68)",
                    border: playerShaftOverlay.available
                      ? "1px solid rgba(70,196,255,0.42)"
                      : "1px solid rgba(255,190,90,0.34)",
                    color: playerShaftOverlay.available
                      ? "rgba(175,230,255,0.98)"
                      : "rgba(255,218,140,0.95)",
                    fontSize: 9,
                    fontWeight: 900,
                    letterSpacing: 0.35,
                    textTransform: "uppercase",
                  }}
                >
                  {playerShaftOverlay.available
                    ? `Measured shaft • ${playerShaftOverlay.confidence}%`
                    : "Shaft unavailable"}
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

          {premiumCheckpoint ? (
            <div style={{ position: "relative", background: "#050505" }}>
              <img
                src={premiumCheckpoint}
                alt={`VCA commercial 3D model P${selectedP}`}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  background: "#050505",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  right: 10,
                  bottom: 10,
                  width: "40%",
                  maxWidth: 260,
                  minWidth: 150,
                  padding: 6,
                  borderRadius: 12,
                  border: "1px solid rgba(0,210,255,0.28)",
                  background: "rgba(0,0,0,0.78)",
                  boxShadow: "0 10px 28px rgba(0,0,0,0.34)",
                }}
              >
                <div
                  style={{
                    marginBottom: 4,
                    fontSize: 8,
                    fontWeight: 900,
                    opacity: 0.62,
                    textTransform: "uppercase",
                    letterSpacing: 0.45,
                  }}
                >
                  Synchronized motion
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
                    v.playbackRate = mode === "slow" ? 0.5 : 2;
                    v.currentTime = frameToVideoTime(cursorFrame);
                    v.pause();
                  }}
                  onTimeUpdate={(e) => {
                    const frame = Math.max(
                      1,
                      Math.min(77, Math.round(e.currentTarget.currentTime * FPS) + 1)
                    );
                    setCursorFrame(frame);
                  }}
                  style={{
                    width: "100%",
                    display: "block",
                    aspectRatio: "4 / 3",
                    objectFit: "contain",
                    borderRadius: 8,
                    background: "#050505",
                  }}
                />
              </div>
            </div>
          ) : (
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
                v.playbackRate = mode === "slow" ? 0.5 : 2;
                v.currentTime = frameToVideoTime(cursorFrame);
                v.pause();
              }}
              onTimeUpdate={(e) => {
                const frame = Math.max(
                  1,
                  Math.min(77, Math.round(e.currentTarget.currentTime * FPS) + 1)
                );
                setCursorFrame(frame);
              }}
              style={{
                width: "100%",
                display: "block",
                aspectRatio: "4 / 3",
                objectFit: "contain",
                background: "#050505",
              }}
            />
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          padding: "10px 12px 8px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.24)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "baseline",
            marginBottom: 8,
            fontSize: 10,
          }}
        >
          <span style={{ fontWeight: 900, letterSpacing: 0.45, textTransform: "uppercase" }}>
            Synchronized Timeline
          </span>
          <span style={{ opacity: 0.58 }}>
            F{cursorFrame} • swing {physicsTimeForFrame(cursorFrame).toFixed(2)}s {cursorFrame > 64 ? "• finish context" : "• precision range"}
          </span>
        </div>

        <input
          type="range"
          min={1}
          max={77}
          step={1}
          value={cursorFrame}
          onChange={(e) => {
            const frame = Number(e.target.value);
            setCursorFrame(frame);
            const v = videoRef.current;
            if (v) {
              v.currentTime = frameToVideoTime(frame);
              v.pause();
            }
          }}
          style={{ width: "100%", display: "block" }}
          aria-label="Swing frame timeline"
        />

        <div style={{ position: "relative", height: 26, margin: "2px 4px 0" }}>
          {Object.entries(CHECKPOINT_FRAMES).map(([pKey, frame]) => {
            const pNum = Number(pKey);
            const left = ((frame - 1) / 76) * 100;
            return (
              <button
                key={pKey}
                type="button"
                onClick={() => jumpTo(pNum)}
                title={`Jump to P${pNum} • F${frame}`}
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  transform: "translateX(-50%)",
                  top: 2,
                  border: 0,
                  padding: 0,
                  background: "transparent",
                  color: selectedP === pNum ? "#fff" : "rgba(255,255,255,0.52)",
                  cursor: "pointer",
                  fontSize: 9,
                  fontWeight: selectedP === pNum ? 900 : 700,
                }}
              >
                P{pNum}
              </button>
            );
          })}
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

        <div
          style={{
            padding: "8px 12px",
            display: "flex",
            gap: 7,
            flexWrap: "wrap",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          {[
            ["body", "Body"],
            ["club", "Club"],
            ["paths", "Paths"],
            ["volumes", "Volumes"],
          ].map(([key, label]) => {
            const k = key as keyof typeof layers;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setLayers((prev) => ({ ...prev, [k]: !prev[k] }))}
                style={pill(layers[k])}
              >
                {label}
              </button>
            );
          })}
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

              {layers.volumes && motionMap.clubEnvelope && (
                <ellipse
                  cx={motionMap.clubEnvelope.cx}
                  cy={motionMap.clubEnvelope.cy}
                  rx={motionMap.clubEnvelope.rx}
                  ry={motionMap.clubEnvelope.ry}
                  fill="rgba(190,65,235,0.10)"
                  stroke="rgba(223,79,255,0.24)"
                  strokeWidth="0.65"
                />
              )}

              {layers.volumes && motionMap.handEnvelope && (
                <ellipse
                  cx={motionMap.handEnvelope.cx}
                  cy={motionMap.handEnvelope.cy}
                  rx={motionMap.handEnvelope.rx}
                  ry={motionMap.handEnvelope.ry}
                  fill="rgba(60,180,255,0.08)"
                  stroke="rgba(70,196,255,0.20)"
                  strokeWidth="0.55"
                />
              )}

              <path
                d={motionMap.clubPath}
                fill="none"
                stroke="rgba(223,79,255,0.82)"
                strokeWidth="1.55"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={layers.paths ? 1 : 0}
              />
              <path
                d={motionMap.gripPath}
                fill="none"
                stroke="rgba(250,182,70,0.88)"
                strokeWidth="1.15"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={layers.paths ? 1 : 0}
              />
              <path
                d={motionMap.handPath}
                fill="none"
                stroke="rgba(70,196,255,0.92)"
                strokeWidth="1.15"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={layers.paths ? 1 : 0}
              />

              {layers.body && [
                ["head", "chest"],
                ["left_shoulder", "right_shoulder"],
                ["left_shoulder", "left_elbow"],
                ["left_elbow", "left_wrist"],
                ["right_shoulder", "right_elbow"],
                ["right_elbow", "right_wrist"],
                ["left_shoulder", "left_hip"],
                ["right_shoulder", "right_hip"],
                ["left_hip", "right_hip"],
                ["left_hip", "left_knee"],
                ["left_knee", "left_ankle"],
                ["right_hip", "right_knee"],
                ["right_knee", "right_ankle"],
                ["chest", "pelvis"],
              ].map(([aKey, bKey]) => {
                const a = motionMap.bodyPoints[aKey];
                const b = motionMap.bodyPoints[bKey];
                if (!a || !b) return null;
                return (
                  <line
                    key={`${aKey}-${bKey}`}
                    x1={a[0]}
                    y1={a[1]}
                    x2={b[0]}
                    y2={b[1]}
                    stroke="rgba(218,238,255,0.88)"
                    strokeWidth="0.72"
                    strokeLinecap="round"
                  />
                );
              })}

              {layers.body && Object.entries(motionMap.bodyPoints).map(([key, pt]) =>
                pt ? (
                  <circle
                    key={key}
                    cx={pt[0]}
                    cy={pt[1]}
                    r={key.includes("wrist") || key === "hands" ? "0.85" : "0.55"}
                    fill={
                      key.includes("wrist") || key === "hands"
                        ? "rgb(70,196,255)"
                        : "rgba(225,240,255,0.94)"
                    }
                  />
                ) : null
              )}

              {layers.club && motionMap.grip && motionMap.clubhead && (
                <line
                  x1={motionMap.grip[0]}
                  y1={motionMap.grip[1]}
                  x2={motionMap.clubhead[0]}
                  y2={motionMap.clubhead[1]}
                  stroke="rgba(255,255,255,0.92)"
                  strokeWidth="0.9"
                  strokeLinecap="round"
                />
              )}

              {layers.body && motionMap.shoulderLeft && motionMap.shoulderRight && (
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

              {layers.body && motionMap.hipLeft && motionMap.hipRight && (
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

              {layers.body && motionMap.chest && motionMap.pelvis && (
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

              {layers.body && motionMap.hands && (
                <circle cx={motionMap.hands[0]} cy={motionMap.hands[1]} r="1.6" fill="rgb(70,196,255)" />
              )}
              {layers.club && motionMap.grip && (
                <circle cx={motionMap.grip[0]} cy={motionMap.grip[1]} r="1.45" fill="rgb(250,182,70)" />
              )}
              {layers.club && motionMap.clubhead && (
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

      {kinematicGraphs && kinematicGraphs.sequencePeaks.length === 4 && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.28)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 9,
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.55, textTransform: "uppercase" }}>
                Kinematic sequence • P4→P8
              </div>
              <div style={{ marginTop: 2, fontSize: 10, opacity: 0.52 }}>
                First dominant true-time peak • smoothed 5-state window
              </div>
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 900,
                color: kinematicGraphs.sequenceInOrder
                  ? "rgba(125,255,180,0.95)"
                  : "rgba(255,205,100,0.95)",
              }}
            >
              {kinematicGraphs.sequenceInOrder ? "TRANSFER ORDERED" : "ORDER CHECK"}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, auto))",
              alignItems: "center",
              gap: 7,
              overflowX: "auto",
            }}
          >
            {kinematicGraphs.sequencePeaks.flatMap((peak, i) => {
              const peakCard = (
                <div
                  key={`${peak.label}-peak`}
                  style={{
                    minWidth: 108,
                    padding: "9px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.09)",
                    background: "rgba(255,255,255,0.035)",
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 900, opacity: 0.66 }}>
                    {peak.label}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 15, fontWeight: 900 }}>
                    {peak.value.toFixed(peak.unit === "mph" ? 1 : 0)} {peak.unit}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 9, opacity: 0.48 }}>
                    F{peak.frame} • {peak.time.toFixed(3)}s
                  </div>
                </div>
              );

              if (i === kinematicGraphs.sequencePeaks.length - 1) {
                return [peakCard];
              }

              const gap = kinematicGraphs.sequenceGapsMs[i] ?? 0;
              return [
                peakCard,
                <div
                  key={`gap-${i}`}
                  style={{
                    minWidth: 54,
                    textAlign: "center",
                    fontSize: 10,
                    fontWeight: 900,
                    opacity: 0.62,
                    whiteSpace: "nowrap",
                  }}
                >
                  → {gap >= 0 ? "+" : ""}{gap} ms
                </div>,
              ];
            })}
          </div>
        </div>
      )}

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
            setCursorFrame(1);
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
