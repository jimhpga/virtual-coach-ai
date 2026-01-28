"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type SwingKey = "FULL" | "P1"|"P2"|"P3"|"P4"|"P5"|"P6"|"P7"|"P8"|"P9";
type PTimes = Partial<Record<SwingKey, number>>;

type PracticeDay = {
  day: number;
  title: string;
  focus: string;
  drills: string[];
  minutes: number;
};

export type VideoPanelData = {
  videoUrl: string;
  posterUrl?: string;
  pTimes?: PTimes;
  plan14?: PracticeDay[];
};

type Tool = "none" | "line" | "circle";
type Shape =
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "circle"; cx: number; cy: number; r: number };

const YT_BY_POS: Partial<Record<SwingKey, string>> = {
  // Replace these with your exact lesson URLs (or leave defaults for now)
  P1: "https://www.youtube.com/results?search_query=golf+swing+P1+setup",
  P2: "https://www.youtube.com/results?search_query=golf+swing+P2+shaft+parallel",
  P3: "https://www.youtube.com/results?search_query=golf+swing+P3+lead+arm+parallel",
  P4: "https://www.youtube.com/results?search_query=golf+swing+P4+top+of+swing",
  P5: "https://www.youtube.com/results?search_query=golf+swing+P5+lead+arm+parallel+downswing",
  P6: "https://www.youtube.com/results?search_query=golf+swing+P6+shaft+parallel+downswing",
  P7: "https://www.youtube.com/results?search_query=golf+swing+P7+impact",
  P8: "https://www.youtube.com/results?search_query=golf+swing+P8+trail+arm+parallel+follow+through",
  P9: "https://www.youtube.com/results?search_query=golf+swing+P9+finish",
};
const SWING_LABELS: Array<{ key: SwingKey; label: string }> = [
  { key: "FULL", label: "Full swing" },
  { key: "P1", label: "P1 — Setup" },
  { key: "P2", label: "P2 — Shaft parallel (backswing)" },
  { key: "P3", label: "P3 — Lead arm parallel (backswing)" },
  { key: "P4", label: "P4 — Top" },
  { key: "P5", label: "P5 — Lead arm parallel (downswing)" },
  { key: "P6", label: "P6 — Shaft parallel (downswing)" },
  { key: "P7", label: "P7 — Impact" },
  { key: "P8", label: "P8 — Trail arm parallel (follow-through)" },
  { key: "P9", label: "P9 — Finish" },
];

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function ReportVideoPanel({ data }: { data: VideoPanelData }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ===== VCA: dropdown state (P1–P9 + 14-day plan) =====
  const pKeys = ["P1","P2","P3","P4","P5","P6","P7","P8","P9"];
  const [pSel, setPSel] = useState<string>("P1");
  const [daySel, setDaySel] = useState<number>(1);

  

  // ===== VCA: plan fallback (always show something) =====
  const DEFAULT_PLAN14: string[] = Array.from({ length: 14 }).map((_, i) => {
    const d = i + 1;
    return [
      `Day ${d}`,
      `• Warm-up: 5 min (hips + thoracic)`,
      `• Block practice: 20 balls (slow reps to positions)`,
      `• Random practice: 20 balls (full routine)`,
      `• Pressure: 10 balls (pick target, score it)`,
      `• Note: 1 sentence — what moved the needle today?`,
    ].join("\n");
  });

  const planArr: string[] = Array.isArray((data as any)?.plan14)
    ? ((data as any).plan14 as any[]).map(x => String(x ?? "")).filter(Boolean)
    : (Array.isArray((data as any)?.plan14?.days)
      ? ((data as any).plan14.days as any[]).map(x => String(x ?? "")).filter(Boolean)
      : (Array.isArray((data as any)?.plan14?.items)
        ? ((data as any).plan14.items as any[]).map(x => String(x ?? "")).filter(Boolean)
        : (Array.isArray((data as any)?.plan14?.plan)
          ? ((data as any).plan14.plan as any[]).map(x => String(x ?? "")).filter(Boolean)
          : [])));

  const plan14Final = (planArr && planArr.length >= 1) ? planArr : DEFAULT_PLAN14;

  const dayText = plan14Final[Math.max(0, Math.min(13, (daySel - 1)))] ?? DEFAULT_PLAN14[0];
  // ===== END VCA: plan fallback =====
const seekToP = (k: string) => {
    try{
      const t = (data as any)?.pTimes?.[k];
      if(typeof t === "number" && videoRef.current){
        videoRef.current.currentTime = Math.max(0, t);
        videoRef.current.play?.();
      }
    } catch {}
  };

  const openYouTubeForP = (k: string) => {
    // Prefer: "error/fault" video (most important)
    const fk = String((data as any)?.faultKey || "").trim();
    const fl = String((data as any)?.faultLabel || "").trim();

    // Map fault keys to better YouTube searches (MVP: search-based, always works)
    const faultQuery = (() => {
      switch (fk) {
        case "clubface_control":   return "golf clubface control through impact drill";
        case "low_point_control":  return "golf low point control towel drill ball first";
        case "sequence_timing":    return "golf transition sequencing pressure then turn drill";
        case "low_turn":           return "golf hip turn backswing drill";
        case "early_extension":    return "golf early extension fix drill";
        case "over_the_top":       return "golf over the top fix shallowing drill";
        case "casting":            return "golf casting fix lag drill";
        default:
          // Use label if available; otherwise fall back to checkpoint search
          if (fl) return `golf swing fix ${fl} drill`;
          return `golf swing ${k} checkpoint drill`;
      }
    })();

    const q = encodeURIComponent(faultQuery);
    window.open(`https://www.youtube.com/results?search_query=${q}`, "_blank", "noopener,noreferrer");
  };
  // ===== END VCA: dropdown state =====

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [pos, setPos] = useState<SwingKey>("FULL");
  const ytLink = useMemo(() => (pos !== "FULL" ? (YT_BY_POS[pos] ?? "") : ""), [pos]);
  const [day, setDay] = useState<number>(1);

  const [tool, setTool] = useState<Tool>("none");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draft, setDraft] = useState<Shape | null>(null);

  const plan = useMemo(() => {
    if (data.plan14 && data.plan14.length) return data.plan14;
    return Array.from({ length: 14 }).map((_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      focus: "Execute your top fix with slow reps first, then confirm with ball flight.",
      drills: ["Slow reps to positions (mirror/camera)", "10 balls: start-line window"],
      minutes: 20,
    })) as PracticeDay[];
  }, [data.plan14]);

  const selectedDay = plan.find(p => p.day === day) ?? plan[0];

  const pTimes: PTimes = data.pTimes ?? {
    P1: 0.0, P2: 1.0, P3: 1.6, P4: 2.1, P5: 2.4, P6: 2.6, P7: 2.75, P8: 3.1, P9: 3.6,
  };

  function seekTo(key: SwingKey) {
    const v = videoRef.current;
    if (!v) return;

    if (key === "FULL") {
      v.currentTime = 0;
      v.play().catch(() => {});
      return;
    }

    const t = pTimes[key];
    if (typeof t === "number" && Number.isFinite(t)) {
      const dur = v.duration || 9999;
      v.currentTime = clamp(t, 0, Math.max(0, dur - 0.01));
      v.pause();
    } else {
      v.pause();
    }
  }

  function resizeCanvasToWrapper() {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    redraw();
  }

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";

    const all = [...shapes, ...(draft ? [draft] : [])];

    for (const s of all) {
      if (s.kind === "line") {
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  useEffect(() => {
    resizeCanvasToWrapper();
    const onResize = () => resizeCanvasToWrapper();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes, draft]);

  function toLocalPoint(e: React.PointerEvent) {
    const wrap = wrapRef.current;
    if (!wrap) return { x: 0, y: 0 };
    const rect = wrap.getBoundingClientRect();
    return {
      x: clamp(e.clientX - rect.left, 0, rect.width),
      y: clamp(e.clientY - rect.top, 0, rect.height),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (tool === "none") return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const p = toLocalPoint(e);
    if (tool === "line") {
      setDraft({ kind: "line", x1: p.x, y1: p.y, x2: p.x, y2: p.y });
    } else if (tool === "circle") {
      setDraft({ kind: "circle", cx: p.x, cy: p.y, r: 0 });
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draft) return;
    const p = toLocalPoint(e);

    if (draft.kind === "line") {
      setDraft({ ...draft, x2: p.x, y2: p.y });
    } else {
      const dx = p.x - draft.cx;
      const dy = p.y - draft.cy;
      setDraft({ ...draft, r: Math.sqrt(dx * dx + dy * dy) });
    }
  }

  function onPointerUp() {
    if (!draft) return;
    setShapes(prev => [...prev, draft]);
    setDraft(null);
  }

  function clearAll() {
    setShapes([]);
    setDraft(null);
  }

  function undo() {
    setShapes(prev => prev.slice(0, -1));
  }

  const hasVideo = !!(data.videoUrl && data.videoUrl.trim().length);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14, marginTop: 14 }}>
      <div style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.22)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        overflow: "hidden",
      }}>
        <div style={{
          padding: 12,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.85 }}>VIDEO REVIEW</div>
            <div style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.18)",
              opacity: 0.85,
              fontWeight: 700,
            }}>
              {pos === "FULL" ? "Full swing" : pos}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button"
              style={{
                height: 36, borderRadius: 12, padding: "0 10px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: tool === "line" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.22)",
                color: "#e6edf6", cursor: "pointer", fontWeight: 700, fontSize: 12,
              }}
              onClick={() => setTool(t => t === "line" ? "none" : "line")}
            >Line</button>

            <button type="button"
              style={{
                height: 36, borderRadius: 12, padding: "0 10px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: tool === "circle" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.22)",
                color: "#e6edf6", cursor: "pointer", fontWeight: 700, fontSize: 12,
              }}
              onClick={() => setTool(t => t === "circle" ? "none" : "circle")}
            >Circle</button>

            <button type="button"
              style={{
                height: 36, borderRadius: 12, padding: "0 10px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.22)",
                color: "#e6edf6", cursor: shapes.length ? "pointer" : "default",
                fontWeight: 700, fontSize: 12, opacity: shapes.length ? 1 : 0.45,
              }}
              onClick={undo}
              disabled={shapes.length === 0}
            >Undo</button>

            <button type="button"
              style={{
                height: 36, borderRadius: 12, padding: "0 10px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.22)",
                color: "#e6edf6", cursor: (shapes.length || draft) ? "pointer" : "default",
                fontWeight: 700, fontSize: 12, opacity: (shapes.length || draft) ? 1 : 0.45,
              }}
              onClick={clearAll}
              disabled={shapes.length === 0 && !draft}
            >Clear</button>
            <a
              href={ytLink || "https://www.youtube.com"}
              target="_blank"
              rel="noreferrer"
              style={{
                height: 36,
                borderRadius: 12,
                padding: "0 10px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.22)",
                color: "#e6edf6",
                cursor: pos === "FULL" ? "default" : "pointer",
                fontWeight: 700,
                fontSize: 12,
                opacity: pos === "FULL" ? 0.45 : 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                pointerEvents: pos === "FULL" ? "none" : "auto",
              }}
              title={pos === "FULL" ? "Pick P1–P9 to open a lesson" : "Open YouTube lesson for this position"}
            >
              YouTube Lesson
            </a>
          </div>
        </div>

        <div style={{ position: "relative", aspectRatio: "16 / 9", background: "rgba(0,0,0,0.35)" }} ref={wrapRef}>
          {hasVideo ? (
            <>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <div style={{ border:"1px solid rgba(255,255,255,0.14)", background:"rgba(0,0,0,0.22)", borderRadius:12, padding:10 }}>
          <div style={{ fontSize:12, fontWeight:900, opacity:0.9, marginBottom:6 }}>Checkpoint</div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <select
              value={pSel}
              onChange={(e)=>{ const v=e.target.value; setPSel(v); seekToP(v); }}
              style={{ flex:1, height:38, borderRadius:10, border:"1px solid rgba(255,255,255,0.14)", background:"rgba(0,0,0,0.28)", color:"rgba(255,255,255,0.92)", padding:"0 10px", fontWeight:800 }}
            >
              {pKeys.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <button
              type="button"
              onClick={()=>openYouTubeForP(pSel)}
              style={{ height:38, padding:"0 12px", borderRadius:10, border:"1px solid rgba(255,255,255,0.14)", background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.92)", fontWeight:900, cursor:"pointer" }}
              title="Open YouTube lessons for this checkpoint"
            >
              YouTube
            </button>
          </div>
          <div style={{ marginTop:6, fontSize:11, opacity:0.65 }}>
            Pick P1–P9 to jump the video. Use YouTube for drills/explanations.
          </div>
        </div>

        <div style={{ border:"1px solid rgba(255,255,255,0.14)", background:"rgba(0,0,0,0.22)", borderRadius:12, padding:10 }}>
          <div style={{ fontSize:12, fontWeight:900, opacity:0.9, marginBottom:6 }}>14-Day Practice Plan</div>
          <select
            value={daySel}
            onChange={(e)=>setDaySel(Number(e.target.value))}
            style={{ width:"100%", height:38, borderRadius:10, border:"1px solid rgba(255,255,255,0.14)", background:"rgba(0,0,0,0.28)", color:"rgba(255,255,255,0.92)", padding:"0 10px", fontWeight:800 }}
          >
            {Array.from({length:14}).map((_,i)=>(
              <option key={i+1} value={i+1}>Day {i+1}</option>
            ))}
          </select>

          <div style={{ marginTop:8, fontSize:12, lineHeight:1.35, opacity:0.9, whiteSpace:"pre-wrap" }}>
            {dayText || "No plan available yet (wire plan14 into the report response)."}
          </div>
        </div>
      </div>
      <video ref={videoRef}
              src={data.videoUrl}
              poster={data.posterUrl}
              controls
              playsInline
              style={{ width: "100%", height: "100%", display: "block" }}
              onLoadedMetadata={() => resizeCanvasToWrapper()}
            />
            </>
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "grid", placeItems: "center",
              color: "rgba(230,237,246,0.8)", fontWeight: 800, letterSpacing: 0.4
            }}>
              Video not available yet
            </div>
          )}

          <canvas
            ref={canvasRef}
            style={{ position: "absolute", inset: 0, pointerEvents: tool === "none" ? "none" : "auto" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.22)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}>
          <div style={{ padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, opacity: 0.75, textTransform: "uppercase", marginBottom: 6 }}>
              Swing position
            </div>
            <select
              style={{
                width: "100%", height: 42, borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.22)",
                color: "#e6edf6", padding: "0 12px", outline: "none",
              }}
              value={pos}
              onChange={(e) => {
                const v = e.target.value as SwingKey;
                setPos(v);
                seekTo(v);
              }}
            >
              {SWING_LABELS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.22)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}>
          <div style={{ padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, opacity: 0.75, textTransform: "uppercase", marginBottom: 6 }}>
              14-day practice plan
            </div>

            <select
              style={{
                width: "100%", height: 42, borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.22)",
                color: "#e6edf6", padding: "0 12px", outline: "none",
              }}
              value={day}
              onChange={(e) => setDay(parseInt(e.target.value, 10))}
            >
              {plan.map(p => (
                <option key={p.day} value={p.day}>Day {p.day}: {p.title}</option>
              ))}
            </select>

            <div style={{
              marginTop: 10, padding: 12, borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(0,0,0,0.18)",
            }}>
              <div style={{ fontWeight: 900, marginBottom: 6, opacity: 0.9 }}>
                Day {selectedDay.day} — {selectedDay.title}
              </div>

              <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.35 }}>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 900, opacity: 0.9 }}>Focus:</span>{" "}
                  {selectedDay.focus}
                </div>

                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 900, opacity: 0.9 }}>Drills:</span>
                  <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                    {selectedDay.drills.slice(0, 2).map((d, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{d}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span style={{ fontWeight: 900, opacity: 0.9 }}>Time:</span>{" "}
                  {selectedDay.minutes} min
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65, lineHeight: 1.35 }}>
              Tip: choose a position (P1–P9) to pause the video there. Use Line/Circle to mark key alignments.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}








