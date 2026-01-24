"use client";


function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawSegment(ctx: CanvasRenderingContext2D, a: {x:number;y:number} | null, b: {x:number;y:number} | null) {
  if (!a || !b) return;

  // outline pass (black under-stroke)
  const prevW = ctx.lineWidth;
  const prevS = ctx.strokeStyle as any;
  const prevA = ctx.globalAlpha;

  ctx.globalAlpha = Math.min(1, (prevA ?? 1) + 0.15);
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.lineWidth = prevW + 2.0;

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();

  // restore + normal pass (current style)
  ctx.globalAlpha = prevA;
  ctx.strokeStyle = prevS;
  ctx.lineWidth = prevW;

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  a: {x:number;y:number} | null,
  b: {x:number;y:number} | null,
  style?: { stroke?: string; width?: number; dash?: number[] }
) {
  if (!a || !b) return;
  
  // --- VCA: temporary style override (bars only)
  const __prevStroke = ctx.strokeStyle;
  const __prevWidth  = ctx.lineWidth;
  const __prevDash   = (ctx.getLineDash ? ctx.getLineDash() : []) as any;
  if (style) {
    if (style.stroke) (ctx.strokeStyle as any) = style.stroke;
    if (typeof style.width === "number") ctx.lineWidth = style.width;
    if (style.dash && ctx.setLineDash) ctx.setLineDash(style.dash);
  }// mid-point and perpendicular normal for a short "bar"
  const mx = (a.x + b.x) * 0.5;
  const my = (a.y + b.y) * 0.5;
  const dx = (b.x - a.x);
  const dy = (b.y - a.y);
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny =  dx / len;
  const half = Math.min(18, Math.max(10, len * 0.18)); // 10..18 px
  const p1 = { x: mx - nx * half, y: my - ny * half };
  const p2 = { x: mx + nx * half, y: my + ny * half };
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);  // --- VCA: restore bar style
  if (style) {
    (ctx.strokeStyle as any) = __prevStroke as any;
    ctx.lineWidth = __prevWidth as any;
    if (ctx.setLineDash) ctx.setLineDash(__prevDash as any);
  }

}import React, { useEffect, useMemo, useRef } from "react";

type Joint = { x: number; y: number; c: number };
type PoseFrame = { frame: number; t_ms: number | null; joints: Record<string, Joint> };
type PoseJson = { version: number; fps: number; width: number; height: number; frames: PoseFrame[] };

const EDGES: [string, string][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],

  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],

  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],

  ["left_ankle", "left_heel"],
  ["left_heel", "left_foot_index"],
  ["right_ankle", "right_heel"],
  ["right_heel", "right_foot_index"],
];

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function PoseOverlay2D({
  videoRef,
  pose,
  enabled,
  minConf = 0.35,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  pose: PoseJson | null;
  enabled: boolean;
  minConf?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const frames = pose?.frames ?? [];
  const hasTimes = useMemo(() => frames.some((f) => typeof f.t_ms === "number"), [frames]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    function sizeCanvasToVideo() {
      const rect = video.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width));
      canvas.height = Math.max(1, Math.floor(rect.height));
    }

    sizeCanvasToVideo();
    const ro = new ResizeObserver(() => sizeCanvasToVideo());
    ro.observe(video);
    return () => ro.disconnect();
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
/* __VCA_GETJOINT__ */
const J = (...keys: string[]) => {
  for (const k of keys) {
    const v = (pf?.joints as any)?.[k];
    if (v) return v;
  }
  return null;
};
    if (!ctx) return;

    function findPoseFrameAt(tMs: number): PoseFrame | null {
      if (!frames.length) return null;

      if (!hasTimes) {
        const fps = pose?.fps ?? 30;
        const idx = Math.max(0, Math.min(frames.length - 1, Math.round((tMs / 1000) * fps)));
        return frames[idx] ?? frames[0];
      }

      let best: PoseFrame | null = null;
      let bestDt = Infinity;
      for (const f of frames) {
        const ft = typeof f.t_ms === "number" ? f.t_ms : null;
        if (ft === null) continue;
        const dt = Math.abs(ft - tMs);
        if (dt < bestDt) {
          bestDt = dt;
          best = f;
        }
      }
      return best ?? frames[0];
    }

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!enabled) return;
      if (!pose || !frames.length) return;

      const tMs = video.currentTime * 1000;
      const pf = findPoseFrameAt(tMs);
      if (!pf) return;

      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.9; ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.fillStyle = "rgba(255,255,255,0.95)"; const getPt = (name: string) => {
        const j = /* __VCA_JOINTS_LOGGED__ */
try {
  const w:any = (globalThis as any);
  if (!w.__vca_joint_log_once) {
    w.__vca_joint_log_once = true;
    console.log("[VCA] joint keys sample:", Object.keys(pf?.joints ?? {}).slice(0, 50));
    console.log("[VCA] has left_hip?", !!pf?.joints?.["left_hip"], "has leftHip?", !!pf?.joints?.["leftHip"], "has l_hip?", !!pf?.joints?.["l_hip"], "has hip_l?", !!pf?.joints?.["hip_l"]);
  }
} catch {}

pf.joints?.[name];
        if (!j) return null;
        if (typeof j.c === "number" && j.c < minConf) return null;
        return { x: clamp01(j.x) * canvas.width, y: clamp01(j.y) * canvas.height };
      };

      ctx.beginPath();
      for (const [a, b] of EDGES) {
        const pa = getPt(a);
        const pb = getPt(b);
        if (!pa || !pb) continue;
        // thickness: torso > limbs (best-effort)

        // if you have names available, swap this for a real segment-name check later

        ctx.lineWidth = 2.5;

        ctx.moveTo(pa.x, pa.y);

        ctx.lineTo(pb.x, pb.y);
      }
      ctx.stroke();

      for (const k of Object.keys(/* __VCA_JOINTS_LOGGED__ */
try {
  const w:any = (globalThis as any);
  if (!w.__vca_joint_log_once) {
    w.__vca_joint_log_once = true;
    console.log("[VCA] joint keys sample:", Object.keys(pf?.joints ?? {}).slice(0, 50));
    console.log("[VCA] has left_hip?", !!pf?.joints?.["left_hip"], "has leftHip?", !!pf?.joints?.["leftHip"], "has l_hip?", !!pf?.joints?.["l_hip"], "has hip_l?", !!pf?.joints?.["hip_l"]);
  }
} catch {}

pf.joints || {})) {
        const p = getPt(k);
        if (!p) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [videoRef, pose, enabled, frames, hasTimes, minConf]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none", border: "2px solid rgba(255,0,255,0.55)",
      }}
    />
  );
}










