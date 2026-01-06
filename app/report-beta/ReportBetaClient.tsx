"use client";


import "./reportbeta.css";
import PStrip from "./PStrip";


import React, { useMemo, useRef, useState } from "react";

type PFrame = {
  p: number;
  label: string;
  frame: number;
  file: string;
  imageUrl: string;
  thumbUrl: string;
};

type AnalyzeResponse = {
  ok: boolean;
  level?: string;
  media?: { framesDir: string; frames: PFrame[] };
  scores?: {
    swing?: number;
    power?: number;
    reliability?: number;
    speed?: number;
    efficiency?: number;
    consistency?: number;
  };
  narrative?: { good?: string[]; improve?: string[]; powerLeaks?: string[] };
  error?: string;
};

const LEVEL_HELP: Record<string, string> = {
  beginner: "Beginner = normal words. Advanced = more detail (don’t go down the rabbit hole).",
  intermediate: "Intermediate = simple + a bit more detail.",
  advanced: "Advanced = deeper detail (optional).",
  teacher: "Teacher = technical detail for coaches and better players.",
};

const DICTIONARY: Record<string, { title: string; body: string }> = {
  "safe hallway": {
    title: "Safe hallway (your ‘lane’)",
    body:
      "It’s the lane where your hands and the club travel so you don’t have to save the swing at the bottom. " +
      "Stay in the lane going back and coming down = solid contact with less guessing.",
  },
  "hand path": {
    title: "Hand path",
    body:
      "It’s simply where your hands travel as you swing. Great ball strikers bring the hands up and down in a similar lane — " +
      "that keeps the clubface from being ‘saved’ late.",
  },
  "lead arm": {
    title: "Lead arm stability",
    body:
      "It’s how stable your front arm stays. If it collapses early going back, or breaks down too soon after impact, " +
      "you’ll lose both power and control.",
  },
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function Bar({ label, value }: { label: string; value: number }) {
  const v = clamp(Math.round(value), 0, 100);
  return (<>
      <div className="rbWrap">
        <div className="rbCard">
          <div className="rbSectionHeader">
            <div>
              <h1 className="rbTitle">Swing Report</h1>
              <p className="rbSub">Report Beta</p>
            </div>
            <div className="rbNote">Virtual Coach AI</div>
          </div>
          <div className="rbBody">
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.9 }}>
        <div style={{ fontWeight: 800 }}>{label}</div>
        <div style={{ fontVariantNumeric: "tabular-nums", opacity: 0.85 }}>{v}</div>
      </div>
      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,0.10)",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div
          style={{
            width: `${v}%`,
            height: "100%",
            background: "linear-gradient(90deg, rgba(66,140,255,0.9), rgba(44,220,170,0.9))",
          }}
        />
      </div>
    </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PillButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        borderRadius: 999,
        padding: "10px 14px",
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.25)",
        color: "#e6edf6",
        cursor: "pointer",
        fontWeight: 800,
        fontSize: 13,
        ...props.style,
      }}
    />
  );
}

function Card({ title, children, right }: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.25)",
        boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
        overflow: "hidden",
      }}
    >
      {(title || right) && (
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>{title}</div>
          {right}
        </div>
      )}
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

export default function ReportBetaClient() {
  const [videoUrl, setVideoUrl] = useState("/uploads/1767545829462-VCA_Impact_Hero_candidate3.mp4");
  const [impactFrame, setImpactFrame] = useState<number>(62);
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced" | "teacher">("beginner");

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dictKey, setDictKey] = useState<keyof typeof DICTIONARY | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [curTime, setCurTime] = useState(0);
  const fps = 30;

  const frames = data?.media?.frames ?? [];
  const sortedFrames = useMemo(() => [...frames].sort((a, b) => a.p - b.p), [frames]);

  async function analyze() {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/analyze-swing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, impactFrame, level }),
      });

      const json = (await res.json().catch(() => null)) as AnalyzeResponse | null;

      if (!res.ok || !json?.ok) throw new Error(json?.error || `Analyze failed (${res.status})`);

      setData(json);

      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e: any) {
      setError(e?.message || "Analyze failed");
    } finally {
      setLoading(false);
    }
  }

  function jumpToP(p: number) {
    const f = sortedFrames.find((x) => x.p === p);
    if (!f) return;
    const t = f.frame / fps;
    if (videoRef.current) {
      videoRef.current.currentTime = t;
      videoRef.current.pause();
      setCurTime(t);
    }
  }

  function stepFrames(delta: number) {
    const v = videoRef.current;
    if (!v) return;
    const next = clamp(v.currentTime + delta / fps, 0, Math.max(0, duration - 0.01));
    v.currentTime = next;
    v.pause();
    setCurTime(next);
  }

  const scores = useMemo(() => {
    const s = data?.scores;
    return {
      swing: s?.swing ?? 82,
      power: s?.power ?? 78,
      reliability: s?.reliability ?? 74,
      speed: s?.speed ?? 77,
      efficiency: s?.efficiency ?? 73,
      consistency: s?.consistency ?? 72,
    };
  }, [data]);

  const narrative = useMemo(() => {
    const n = data?.narrative;
    return {
      good:
        n?.good ?? [
          "Good balance and posture through the motion.",
          "Solid rhythm—nothing looks rushed.",
          "Nice intent to swing through the target.",
        ],
      improve:
        n?.improve ?? [
          "Clean up the transition so the hands don’t ‘throw’ early.",
          "Keep your chest over the ball longer through impact.",
          "Stay in your safe hallway on the way down.",
        ],
      powerLeaks:
        n?.powerLeaks ?? [
          "Arms outrun the body into impact (costs strike + speed).",
          "Standing up through impact (creates thin/fat misses).",
          "Club drifts outside the safe hallway coming down (requires saving it late).",
        ],
    };
  }, [data]);

  const pageShell: React.CSSProperties = {
    minHeight: "100vh",
    padding: "26px 18px 60px",
    color: "#e6edf6",
    background:
      "radial-gradient(1200px 700px at 20% 0%, rgba(66,140,255,0.22), transparent 55%), radial-gradient(900px 600px at 80% 0%, rgba(44,220,170,0.16), transparent 55%), linear-gradient(180deg, #08101a 0%, #050a10 70%, #05070b 100%)",
  };

  return (
    <div style={pageShell}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900 }}>Virtual Coach AI</div>
            <div style={{ opacity: 0.85, marginTop: 4 }}>Upload once. Get frames, scores, and coaching that makes sense.</div>
          </div>
          <a href="/" style={{ color: "#b9cff6", textDecoration: "none", fontWeight: 800 }}>← Home</a>
        </div>

        <Card title="Swing Report — Beta">
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.4fr 0.6fr 0.5fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900, marginBottom: 6 }}>Video URL</div>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="/uploads/yourfile.mp4"
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.18)",
                  color: "#e6edf6",
                  padding: "0 12px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900, marginBottom: 6 }}>Impact frame</div>
              <input
                type="number"
                value={impactFrame}
                onChange={(e) => setImpactFrame(parseInt(e.target.value || "0", 10))}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.18)",
                  color: "#e6edf6",
                  padding: "0 12px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900, marginBottom: 6 }}>Level</div>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.18)",
                  color: "#e6edf6",
                  padding: "0 12px",
                  outline: "none",
                  fontWeight: 800,
                }}
              >
                <option value="beginner">Beginner (simple)</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="teacher">Teacher (technical)</option>
              </select>
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>{LEVEL_HELP[level]}</div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={analyze}
                disabled={loading}
                style={{
                  width: "100%",
                  height: 44,
                  borderRadius: 14,
                  border: "1px solid rgba(66,140,255,0.55)",
                  background: loading ? "rgba(66,140,255,0.30)" : "rgba(66,140,255,0.85)",
                  color: "#04111f",
                  fontWeight: 900,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Analyzing…" : "Analyze"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <PillButton onClick={() => setDictKey("safe hallway")}>I don’t understand: safe hallway</PillButton>
            <PillButton onClick={() => setDictKey("hand path")}>I don’t understand: hand path</PillButton>
            <PillButton onClick={() => setDictKey("lead arm")}>I don’t understand: lead arm</PillButton>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(255,80,80,0.35)", background: "rgba(255,80,80,0.08)" }}>
              <div style={{ fontWeight: 900, color: "#ffb4b4" }}>Error</div>
              <div style={{ opacity: 0.9, marginTop: 4 }}>{error}</div>
            </div>
          )}
        </Card>

        <div id="results" style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 14 }}>
          <Card
            title="Fine Viewer (frame-by-frame)"
            right={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((p) => (
                  <PillButton key={p} onClick={() => jumpToP(p)} disabled={!sortedFrames.length}>
                    P{p}
                  </PillButton>
                ))}
              </div>
            }
          >
            <video
              ref={(el) => (videoRef.current = el)}
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              style={{ width: "100%", borderRadius: 14, background: "#000", border: "1px solid rgba(255,255,255,0.10)" }}
              onLoadedMetadata={(e) => setDuration((e.currentTarget as HTMLVideoElement).duration || 0)}
              onTimeUpdate={(e) => setCurTime((e.currentTarget as HTMLVideoElement).currentTime || 0)}
            />

      <PStrip />

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <PillButton onClick={() => stepFrames(-1)} disabled={!duration}>◀︎ 1 frame</PillButton>
                <PillButton onClick={() => stepFrames(+1)} disabled={!duration}>1 frame ▶︎</PillButton>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, duration)}
                step={1 / fps}
                value={curTime}
                onChange={(e) => {
                  const t = parseFloat(e.target.value);
                  const v = videoRef.current;
                  if (v) { v.currentTime = t; v.pause(); }
                  setCurTime(t);
                }}
              />
              <div style={{ fontSize: 12, opacity: 0.85, fontVariantNumeric: "tabular-nums" }}>
                {curTime.toFixed(2)}s / {duration ? duration.toFixed(2) : "—"}s
              </div>
            </div>

            <div style={{ marginTop: 12, fontWeight: 900, opacity: 0.92 }}>P1–P9 frames</div>

            {!sortedFrames.length ? (
              <div style={{ opacity: 0.75, marginTop: 6 }}>Run Analyze to populate frames.</div>
            ) : (
              <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(9, minmax(0, 1fr))", gap: 8 }}>
                {sortedFrames.map((f) => (
                  <button
                    key={f.p}
                    onClick={() => jumpToP(f.p)}
                    style={{
                      padding: 0,
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 12,
                      overflow: "hidden",
                      cursor: "pointer",
                      background: "rgba(0,0,0,0.2)",
                    }}
                    title={`Jump to ${f.label}`}
                  >
                    <div style={{ padding: "6px 8px", fontSize: 12, fontWeight: 900, opacity: 0.9 }}>{f.label}</div>
                    <img src={f.thumbUrl || f.imageUrl} alt={f.label} style={{ width: "100%", display: "block", aspectRatio: "16/9", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
            <Card title="Scoreboard">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  ["Swing Score", scores.swing],
                  ["Power", scores.power],
                  ["Reliability", scores.reliability],
                ].map(([k, v]) => (
                  <div key={k as string} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: 12, background: "rgba(0,0,0,0.18)" }}>
                    <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>{k as string}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{v as number}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 900, marginBottom: 8, opacity: 0.92 }}>Power + Reliability (estimated)</div>
                <Bar label="Speed" value={scores.speed} />
                <Bar label="Impact efficiency" value={scores.efficiency} />
                <Bar label="Consistency" value={scores.consistency} />
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 10 }}>
                  AI explanation: Power = speed delivered into solid strike. Reliability = how repeatable contact and start-line are.
                </div>
              </div>
            </Card>

            <Card title="3 things you do well">
              <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9, lineHeight: 1.6 }}>
                {narrative.good.slice(0, 3).map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </Card>

            <Card title="3 things to improve next">
              <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9, lineHeight: 1.6 }}>
                {narrative.improve.slice(0, 3).map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </Card>

            <Card title="3 possible power leaks">
              <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9, lineHeight: 1.6 }}>
                {narrative.powerLeaks.slice(0, 3).map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </Card>
          </div>
        </div>

        {dictKey && (
          <div
            onClick={() => setDictKey(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", display: "grid", placeItems: "center", padding: 16, zIndex: 50 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: "min(720px, 96vw)", borderRadius: 18, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(6,10,16,0.95)", boxShadow: "0 20px 70px rgba(0,0,0,0.6)", overflow: "hidden" }}
            >
              <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.10)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{DICTIONARY[dictKey].title}</div>
                <button
                  onClick={() => setDictKey(null)}
                  style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.25)", color: "#e6edf6", padding: "8px 10px", cursor: "pointer", fontWeight: 900 }}
                >
                  Close
                </button>
              </div>
              <div style={{ padding: 16, lineHeight: 1.65, opacity: 0.92 }}>{DICTIONARY[dictKey].body}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}





