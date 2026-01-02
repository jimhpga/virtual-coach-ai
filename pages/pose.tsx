import React, { useMemo, useRef, useState } from "react";
import Head from "next/head";
import BrandShell from "../components/BrandShell";

type Status = "ON_TRACK" | "NEEDS_ATTENTION" | "PRIORITY_FIX";

type Keypoint = {
  name: string;
  x: number; // 0..1
  y: number; // 0..1
  score: number; // 0..1
};

type PoseFrame = {
  frameIndex: number;
  phase: string; // P1..P9
  points: Keypoint[];
};

type PoseEstimateResponse = {
  ok: true;
  source: string;
  uploadId: string;
  activePhase: string;
  overall: {
    confidence: number;
    stability: number;
    speed: number;
  };
  angles: Array<{
    label: string;
    valueDeg: number;
    status: Status;
  }>;
  frames: PoseFrame[];
};

type ErrorResponse = { ok: false; error: string };

const PHASES = ["P1","P2","P3","P4","P5","P6","P7","P8","P9"] as const;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
function fmtPct(n: number) { return `${Math.round(clamp01(n)*100)}%`; }
function fmtDeg(n: number) { return `${Math.round(n)}°`; }

function statusChip(s: Status) {
  if (s === "ON_TRACK") return { label: "On track", bg: "rgba(34,197,94,0.18)", bd: "rgba(34,197,94,0.45)" };
  if (s === "NEEDS_ATTENTION") return { label: "Needs attention", bg: "rgba(234,179,8,0.18)", bd: "rgba(234,179,8,0.45)" };
  return { label: "Priority fix", bg: "rgba(239,68,68,0.18)", bd: "rgba(239,68,68,0.45)" };
}

// Simple stick figure connections (based on the points your mock returns)
const EDGES: Array<[string,string]> = [
  ["left_eye","nose"], ["right_eye","nose"],
  ["left_shoulder","right_shoulder"],
  ["left_shoulder","left_elbow"], ["left_elbow","left_wrist"],
  ["right_shoulder","right_elbow"], ["right_elbow","right_wrist"],
  ["left_hip","right_hip"],
  ["left_shoulder","left_hip"], ["right_shoulder","right_hip"],
  ["left_hip","left_knee"], ["left_knee","left_ankle"],
  ["right_hip","right_knee"], ["right_knee","right_ankle"],
];

function mapPoints(points: Keypoint[]) {
  const m = new Map<string, Keypoint>();
  for (const p of points) m.set(p.name, p);
  return m;
}

export default function PosePage() {
  const [phase, setPhase] = useState<string>("P5");
  const [uploadId, setUploadId] = useState<string>("demo-123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<PoseEstimateResponse | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeFrame = useMemo(() => {
    if (!data?.frames?.length) return null;
    const hit = data.frames.find((f) => f.phase === (data.activePhase || phase));
    return hit || data.frames[Math.min(4, data.frames.length - 1)];
  }, [data, phase]);

  const pts = useMemo(() => (activeFrame ? mapPoints(activeFrame.points) : null), [activeFrame]);

  async function runEstimate() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/pose-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, activePhase: phase }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Pose estimate failed");
      }
      setData(json as PoseEstimateResponse);
    } catch (e: any) {
      setErr(e?.message || "Pose estimate failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    color: "#fff",
    padding: "18px 16px 34px",
  };

  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1.4fr 0.9fr",
    gap: 16,
    alignItems: "start",
  };

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.28)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 18px 55px rgba(0,0,0,0.55)",
    overflow: "hidden",
  };

  const cardPad: React.CSSProperties = { padding: 16 };

  const input: React.CSSProperties = {
    height: 40,
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    padding: "0 12px",
    outline: "none",
  };

  const btn: React.CSSProperties = {
    height: 42,
    borderRadius: 12,
    border: "1px solid rgba(34,197,94,0.45)",
    background: "rgba(34,197,94,0.18)",
    color: "#fff",
    fontWeight: 900,
    padding: "0 14px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const btnGhost: React.CSSProperties = {
    ...btn,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.20)",
    fontWeight: 800,
  };


  return(
    <>
      <Head>
        <title>Pose Estimation • Virtual Coach AI</title>
      </Head>

      <BrandShell title="Pose Estimation">
        <div style={shell}>
          {/* Top controls */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.6fr auto auto", gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900, letterSpacing: 1, marginBottom: 6 }}>
                Upload ID (demo for now)
              </div>
              <input
                style={input}
                value={uploadId}
                onChange={(e) => setUploadId(e.target.value)}
                placeholder="demo-123"
              />
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900, letterSpacing: 1, marginBottom: 6 }}>
                Active phase
              </div>
              <select style={input} value={phase} onChange={(e) => setPhase(e.target.value)}>
                {PHASES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <button style={btn} onClick={runEstimate} disabled={loading}>
              {loading ? "Running..." : "Run Pose Estimation"}
            </button>

            <button
              style={btnGhost}
              onClick={() => {
                setErr(null);
                setData(null);
              }}
              disabled={loading}
              title="Clear"
            >
              Clear
            </button>
          </div>

          {err && (
            <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.12)" }}>
              <div style={{ fontWeight: 900 }}>Pose error</div>
              <div style={{ opacity: 0.9 }}>{err}</div>
            </div>
          )}

          <div style={grid}>
            {/* LEFT: video + overlay */}
            <div style={card}>
              <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.10)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.8, letterSpacing: 1, fontWeight: 900 }}>VIDEO + OVERLAY</div>
                  <div style={{ fontSize: 16, fontWeight: 1000, marginTop: 2 }}>
                    Pose preview ({data?.activePhase || phase})
                  </div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {data ? `source: ${data.source}` : "source: —"}
                </div>
              </div>

              <div style={{ position: "relative", background: "#000" }}>
                {/* Video placeholder: keep it real-simple like your reference */}
                <div style={{ position: "relative", width: "100%", borderRadius: 16, zIndex: 9999, outline: "4px solid rgba(0,255,140,0.95)", overflow: "hidden", background: "#0b0f14", border: "1px solid rgba(255,255,255,0.10)" }}>
  <div style={{ width: "100%", aspectRatio: "16/9", background: "#0b0f14" as any }} />
  <video
    poster="/pose-demo.jpg"
    ref={videoRef}
    controls
    playsInline
    preload="metadata"
    style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      display: "block",
      objectFit: "cover",
      background: "#0b0f14"
    }}
  />
</div>
{/* Overlay */}
                <svg
                  viewBox="0 0 1000 562"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                  }}
                >
                  {/* dim glass */}
                  <rect x="0" y="0" width="1000" height="562" fill="rgba(0,0,0,0.12)" />

                  {/* skeleton */}
                  {pts && (
                    <>
                      {/* edges */}
                      {EDGES.map(([a, b]) => {
                        const pa = pts.get(a);
                        const pb = pts.get(b);
                        if (!pa || !pb) return null;
                        const x1 = pa.x * 1000;
                        const y1 = pa.y * 562;
                        const x2 = pb.x * 1000;
                        const y2 = pb.y * 562;
                        const alpha = 0.20 + 0.55 * Math.min(pa.score, pb.score);
                        return(
                          <line
                            key={`${a}-${b}`}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={`rgba(34,197,94,${alpha.toFixed(3)})`}
                            strokeWidth={6}
                            strokeLinecap="round"
                          />
                        );
                      })}

                      {/* points */}
                      {Array.from(pts.values()).map((p) => {
                        const x = p.x * 1000;
                        const y = p.y * 562;
                        const r = 6 + p.score * 6;
                        const alpha = 0.35 + 0.55 * p.score;
                        return(
                          <circle
                            key={p.name}
                            cx={x}
                            cy={y}
                            r={r}
                            fill={`rgba(255,255,255,${(alpha * 0.7).toFixed(3)})`}
                            stroke={`rgba(34,197,94,${alpha.toFixed(3)})`}
                            strokeWidth={3}
                          />
                        );
                      })}
                    </>
                  )}

                  {/* phase badge */}
                  <g>
                    <rect x="18" y="18" width="132" height="46" rx="14" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.14)" />
                    <text x="84" y="48" textAnchor="middle" fill="white" fontSize="20" fontFamily="system-ui" fontWeight="900">
                      {data?.activePhase || phase}
                    </text>
                  </g>
                </svg>
              </div>

              <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.10)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Tip: this is mock overlay data. Next step is plugging MediaPipe/MMPose into the API.
                </div>
              </div>
            </div>

            {/* RIGHT: metrics cards like your reference */}
            <div style={{ display: "grid", gap: 16 }}>
              {/* Overall */}
              <div style={card}>
                <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                  <div style={{ fontSize: 12, opacity: 0.8, letterSpacing: 1, fontWeight: 900 }}>OVERVIEW</div>
                  <div style={{ fontSize: 16, fontWeight: 1000, marginTop: 2 }}>Pose quality</div>
                </div>
                <div style={{ ...cardPad, display: "grid", gap: 12 }}>
                  {[
                    { label: "Confidence", v: data?.overall?.confidence ?? 0.0 },
                    { label: "Stability", v: data?.overall?.stability ?? 0.0 },
                    { label: "Speed proxy", v: data?.overall?.speed ?? 0.0 },
                  ].map((m) => (
                    <div key={m.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.85, fontWeight: 900 }}>
                        <span>{m.label}</span>
                        <span>{fmtPct(m.v)}</span>
                      </div>
                      <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.10)", overflow: "hidden", marginTop: 8 }}>
                        <div style={{ height: "100%", width: `${Math.round(clamp01(m.v) * 100)}%`, background: "rgba(34,197,94,0.55)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Angles */}
              <div style={card}>
                <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                  <div style={{ fontSize: 12, opacity: 0.8, letterSpacing: 1, fontWeight: 900 }}>ANGLES</div>
                  <div style={{ fontSize: 16, fontWeight: 1000, marginTop: 2 }}>Estimated biomechanics</div>
                </div>

                <div style={{ padding: 12, display: "grid", gap: 10 }}>
                  {(data?.angles || []).length === 0 ? (
                    <div style={{ padding: 12, borderRadius: 12, border: "1px dashed rgba(255,255,255,0.18)", opacity: 0.85 }}>
                      Click <b>Run Pose Estimation</b> to populate metrics.
                    </div>
                  ) : (
                    (data?.angles || []).map((a) => {
                      const chip = statusChip(a.status);
                      return(
                        <div key={a.label} style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.18)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                            <div style={{ fontWeight: 1000 }}>{a.label}</div>
                            <div style={{ fontWeight: 1000, opacity: 0.95 }}>{fmtDeg(a.valueDeg)}</div>
                          </div>
                          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, opacity: 0.8 }}>Status</span>
                            <span style={{
                              fontSize: 12,
                              fontWeight: 900,
                              padding: "6px 10px",
                              borderRadius: 999,
                              border: `1px solid ${chip.bd}`,
                              background: chip.bg
                            }}>
                              {chip.label}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Mini callouts */}
              <div style={card}>
                <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                  <div style={{ fontSize: 12, opacity: 0.8, letterSpacing: 1, fontWeight: 900 }}>NEXT</div>
                  <div style={{ fontSize: 16, fontWeight: 1000, marginTop: 2 }}>What we wire next</div>
                </div>
                <div style={{ ...cardPad, fontSize: 13, opacity: 0.9, lineHeight: 1.55 }}>
                  <div style={{ marginBottom: 10 }}>1) Add a real video input (upload or URL) and feed frames to the API.</div>
                  <div style={{ marginBottom: 10 }}>2) Replace mock pose with MediaPipe / MMPose output.</div>
                  <div>3) Use P1–P9 frameIndex to auto-sync your report checkpoints.</div>
                </div>
              </div>
            </div>
          </div>

          {/* footer note */}
          <div style={{ marginTop: 14, fontSize: 12, opacity: 0.75 }}>
            If you want this page to match the reference even closer, we’ll add: timeline scrubber, multi-frame overlay, and side-by-side “tour model vs you”.
          </div>
        </div>
      </BrandShell>
    </>
  );
}












