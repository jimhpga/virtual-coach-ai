"use client";
import PStrip from "./PStrip";
import React, { useEffect, useMemo, useRef, useState } from "react";


import { SwingFactsCard } from "../components/SwingFactsCard";
import { PDescriptionsCollapsed } from "../../components/PDescriptionsCollapsed";
import { TinyCard, ConfidenceMeter } from "../_components/UI";
import { prescribe, type FaultKey } from "../_logic/drills";

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
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.9 }}>
        <div style={{ fontWeight: 700 }}>{label}</div>
        <div style={{ fontVariantNumeric: "tabular-nums", opacity: 0.75 }}>{v}</div>
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
            width: v + "%",
            height: "100%",
            background: "linear-gradient(90deg, rgba(66,140,255,0.9), rgba(44,220,170,0.9))",
          }}
        />
      </div>
    </div>
  );
}
function PillButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (

<button
      type="button"
      {...props}
      style={{
        borderRadius: 999,
        padding: "10px 14px",
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.25)",
        color: "#e6edf6",
        cursor: props.disabled ? "not-allowed" : "pointer",
        fontWeight: 700,
        fontSize: 13,
        opacity: props.disabled ? 0.6 : 1,
        ...props.style,
      }}
    />
  );
}

function Card({
  title,
  children,
  right,
}: {
  title?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
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
{/* VCA_SWING_FACTS_CARD */}
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


function Collapsible(props: {
  title: string;
  defaultOpen?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { title, defaultOpen = true, right, children } = props;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
{/* VCA_SWING_FACTS_CARD */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          cursor: "pointer",
          userSelect: "none",
          fontWeight: 900,
          letterSpacing: 0.2,
          padding: "2px 0 8px",
        }}
        onClick={() => setOpen(!open)}
        role="button"
        aria-expanded={open}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ opacity: 0.75, fontWeight: 900 }}>
            {open ? "▾" : "▸"}
          </span>
          <span>{title}</span>
        </div>
        <div>{right}</div>
      </div>

      {open ? <div>{children}</div> : null}
    </div>
  );
}
function CountPill({ n }: { n: number }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 900,
        padding: "5px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.06)",
        opacity: 0.92,
      }}
    >
      {n}
    </span>
  );
}

function CollapsibleCard({
  title,
  badge,
  open,
  onToggle,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.22)",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
      }}
    >
{/* VCA_SWING_FACTS_CARD */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          cursor: "pointer",
          background: "transparent",
          border: "none",
          color: "inherit",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: open ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.00)",
          transition: "border-bottom-color 180ms ease",
        }}
        aria-expanded={open}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span
            style={{
              display: "inline-block",
              width: 18,
              opacity: 0.9,
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 180ms ease",
            }}
          >
            ▶
          </span>
          <div style={{ fontWeight: 900, letterSpacing: 0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </div>
        </div>

        {badge ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 10, flexShrink: 0 }}>
            {badge}
          </div>
        ) : null}
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div style={{ padding: 14 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function ReportBetaClient() {
  const [activeP, setActiveP] = useState<number | undefined>(undefined);

  // ===== VCA_INTAKE_READ_START =====
  type Intake = { audience?: "adult" | "junior"; focus?: string; fileName?: string | null; createdAt?: string };
  const [intake, setIntake] = useState<Intake | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("vca_intake");
      if (raw) setIntake(JSON.parse(raw));
    } catch (e) {
      // ignore bad JSON / missing storage
    }
  }, []);

  // Confidence = dip -> exit -> climb (simple demo model for now)
  // We tie it to sequencing: if faults include late hips / arms start down => dip.
  // When drills are prescribed + user repeats sessions, score climbs.
  function computeConfidence(args: { faults: FaultKey[]; sessions: number }): { score: number; phase: string; trend: "dip" | "exit" | "climb"; note: string } {
    const hasSeq = args.faults.includes("late_hips") || args.faults.includes("arms_start_down");
    const s = Math.max(0, args.sessions || 0);

    // baseline: confidence dips when you start changing motor pattern (gap/purgatory)
    let base = hasSeq ? 42 : 55;

    // "time in gap" penalty early, then exit bonus
    // sessions 0-2: dip
    // sessions 3-6: exit
    // sessions 7+: climb
    let score = base;
    let trend: "dip" | "exit" | "climb" = "dip";
    let phase = "Motor Pattern Gap";
    let note =
      "If this feels worse before it feels better—good. That means you stopped running the old program and you haven't installed the new one yet.";

    if (s <= 2) {
      score = base - 8 + (s * 2);
      trend = "dip";
      phase = "Dip (normal)";
      note = "You’re in the awkward stage. Results can be noisy. Keep reps clean and slow.";
    } else if (s <= 6) {
      score = base + 5 + (s - 3) * 4;
      trend = "exit";
      phase = "Gap Exit";
      note = "You're exiting the gap. Keep the arms late ~0.08s so the body leads the race.";
    } else {
      score = base + 25 + (s - 7) * 3;
      trend = "climb";
      phase = "Climb";
      note = "Now it’s getting installed. Your ‘feel’ starts matching the truth. Keep stacking reps.";
    }

    return { score: Math.max(10, Math.min(98, score)), phase, trend, note };
  }
  // ===== VCA_INTAKE_READ_END =====
// ✅ Hydration proof + sanity
  useEffect(() => {
    (window as any).__VCA_HYDRATED__ = true;
    console.log("✅ ReportBetaClient hydrated");
  }, []);

  
  
  // Auto-load demo video (newest mp4 in /public/uploads)
useEffect(() => {
  (async () => {
    try {
      const r = await fetch("/api/demo-video", { cache: "no-store" });
      const j = await r.json();
      if (j?.url) setVideoUrl(j.url);
    } catch (e) {
      // ignore demo load failures
    }
  })();
}, []);
const [runStatus, setRunStatus] = useState<string>("");

  // === MVP Demo Hardening: simple run-state machine ===
  type RunState = "idle" | "analyzing" | "frames" | "report" | "error";
  const [runState, setRunState] = useState<RunState>("idle");
  const [runErr, setRunErr] = useState<string>("");

  function stepName(s: RunState){
    if(s==="idle") return "Upload";
    if(s==="analyzing") return "Analyze";
    if(s==="report") return "Report";
    if(s==="error") return "Error";
    return "Upload";
  }
  const [videoUrl, setVideoUrl] = useState<string>("");
const [impactFrame, setImpactFrame] = useState<number>(62);
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced" | "teacher">("beginner");


  // 🎯 Focus + Coach prompt (MVP)
  const focusOptions = [
    "General checkup (full swing)",
    "Coming up / early extension",
    "Right elbow / trail arm",
    "Left arm structure",
    "Hand path (too inside / too out)",
    "Clubface (open / closed)",
    "Over-the-top / steep downswing",
    "Shallowing / getting the club behind me",
    "Casting / early release",
    "Sway / slide",
    "Reverse pivot",
    "Hip rotation / stall",
    "Posture / spine angle",
    "Balance / falling to toes/heels",
    "Low point / fat & thin",
    "Impact (shaft lean / handle position)",
    "Tempo / rushing transition",
    "Arms outrunning pivot",
    "Pressure shift (getting left)",
    "Finish / full release"
  ];
  const [focusTopic, setFocusTopic] = useState<string>(focusOptions[0]);
  const [coachQuestion, setCoachQuestion] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<AnalyzeResponse | null>(null);

  // 🎙️ Ask Coach (voice + typed)
  const [coachQ, setCoachQ] = useState<string>("");
  const focusOptions2 = [
    "Not sure — tell me my #1 priority",
    "Early extension (coming up & out)",
    "Right elbow / trail arm (slotting)",
    "Over the top / steep downswing",
    "Hand path too far outside",
    "Shallowing / dropping the club",
    "Casting / losing lag",
    "Flip / handle stall at impact",
    "Open clubface (slice)",
    "Closed clubface (hook)",
    "Poor low point (fat/thin)",
    "Weight shift / pressure to lead side",
    "Rotation timing (hips vs chest)",
    "Chicken wing / lead arm",
    "Head movement / posture loss",
    "Swing plane / shaft pitch",
    "Tempo too fast",
    "Balance / falling toward toes/heels",
    "Release / rate of closure",
    "Finish position / extension through target"
  ];
  const [focusPick, setFocusPick] = useState<string>(focusOptions2[0]);

  const applyFocusToQuestion = (pick: string) => {
    const p = (pick || "").trim();
    if (!p) return;
    if (p.startsWith("Not sure")) {
      setCoachQ("I’m not sure what to work on. Based on my report, what is my #1 priority and what drill should I do?");
      return;
    }
    setCoachQ(`I want to work on: ${p}. What should I look for in my swing and what drill fixes it?`);
  };
  const [coachA, setCoachA] = useState<string>("");
  const [listening, setListening] = useState<boolean>(false);

  const localCoachAnswer = (q: string) => {
    const s = (q || "").toLowerCase();

    // Quick intent routing for MVP (replace with /api/coach later)
    if (s.includes("right elbow") || s.includes("trail elbow") || s.includes("elbow")) {
      return [
        "Right elbow checkpoint:",
        "• Backswing: elbow points more down than behind you (don’t let it fly).",
        "• Transition: elbow works in front of your right hip—feel it ‘slot’ while chest stays down.",
        "• Downswing: keep the elbow connected to the ribcage; hands don’t throw early.",
        "Drill: towel-under-trail-arm half swings + pause at lead-arm-parallel down (P5)."
      ].join("\n");
    }

    if (
      s.includes("coming up") || s.includes("up and out") || s.includes("stand up") ||
      s.includes("early extend") || s.includes("early extension") || s.includes("humping")
    ) {
      return [
        "Coming up & out (early extension) checkpoint:",
        "• Keep chest over the ball longer; pressure shifts lead before you rotate.",
        "• Feel hips ‘back’ as you start down (left hip back, not toward the ball).",
        "• Keep trail heel heavier a fraction longer; rotate around your lead hip.",
        "Drill: chair/hip-bump drill + slow ‘pump’ to P5 while keeping belt buckle back."
      ].join("\n");
    }

    if (s.includes("shallow") || s.includes("steep") || s.includes("over the top") || s.includes("hand path")) {
      return [
        "Hand path / steepness checkpoint:",
        "• Start down with pressure shift—hands follow.",
        "• Feel trail elbow in front of right hip and club ‘fall’ behind you.",
        "Drill: split-grip pump + step-through swings."
      ].join("\n");
    }

    return [
      "Tell me what you want to work on specifically (example: right elbow, early extension, face control, hand path).",
      "If you’re not sure: say what your miss is (push/slice/pull/hook/thin/fat) and I’ll pick the priority."
    ].join("\n");
  };

  const askCoach = async (q: string) => {
    const text = (q || "").trim();
    if (!text) return;
    setCoachA("Thinking…");

    // ✅ MVP: local answer now. Later swap to an API call.
    // Example future:
    // const r = await fetch("/api/coach", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ 
        // focus: focusTopic,
        //         question: coachQuestion,q:text, data }) });
    // const j = await r.json(); setCoachA(j.answer || "");
    setCoachA(localCoachAnswer(text));
  };

  const startVoice = () => {
    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { setCoachA("Voice not supported in this browser. Type your question below."); return; }
      const rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => setListening(true);
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);

      rec.onresult = (e: any) => {
        const said = e?.results?.[0]?.[0]?.transcript || "";
        const cleaned = (said || "").trim();
        setCoachQ(cleaned);
        if (cleaned) askCoach(cleaned);
      };

      rec.start();
    } catch {
      setListening(false);
      setCoachA("Voice couldn’t start. Type your question below.");
    }
  };

  // Right-rail collapsibles (collapsed by default)
  const [openGood, setOpenGood] = useState<boolean>(false);
  const [openImprove, setOpenImprove] = useState<boolean>(false);
  const [openLeaks, setOpenLeaks] = useState<boolean>(false);

  const expandAll = () => { setOpenGood(true); setOpenImprove(true); setOpenLeaks(true); };
  const collapseAll = () => { setOpenGood(false); setOpenImprove(false); setOpenLeaks(false); };
  const recommendations = (
    data?.narrative?.recommendations ??
    [
      {
        title: "Transition timing",
        how: "Start the downswing by shifting pressure into your lead foot before the hands move. Let the body lead and the arms respond."
      },
      {
        title: "Low point control",
        how: "Keep your chest over the ball through impact and practice brushing the turf just in front of the ball."
      }
    ]
  ).slice(0, 2);
/* ---- AUTO-COMMENTED BROKEN BLOCK (was causing parser error) ----

    summary:
      "Solid fundamentally sound mid-iron swing with small opportunities to clean up transition and low point control.",
    meta:
      "Player: Player • Hand: Right • Eye: Right • Hcp 1 • Generated: 6/13/2024, 5:00 AM",
    body:
      "Hi Player, thanks for sending in your swing. Solid fundamentals overall. Your biggest strengths are an athletic setup with clean spine tilt and balance, solid arm-body connection in the takeaway, and good wrist hinge creating width and leverage. The main things to clean up over the next few weeks are transition timing, shallowing the downswing slightly, and keeping the pivot centered through impact. Use the checkpoints and practice plan below to work through this step-by-step.",
    highlights: [
      "Athletic, balanced setup that supports a powerful coil.",
      "Good wrist hinge and width in the backswing.",
      "Clubface control is generally very good through impact.",
      "Transition timing can get a touch upper-body dominant.",
      "Low point control can tighten up for more compression."
    ]
  };

---- END AUTO-COMMENT ---- */
  // Player overview (API-first, fallback)
  const playerOverview =
    (data as any)?.narrative?.playerOverview ??
    (data as any)?.narrative?.player_overview ??
    {
      summary:
        "Solid fundamentally sound mid-iron swing with small opportunities to clean up transition and low point control.",
      meta:
        "Player: Player • Hand: Right • Eye: Right • Hcp 1 • Generated: 6/13/2024, 5:00 AM",
      body:
        "Hi Player, thanks for sending in your swing. Solid fundamentals overall. Your biggest strengths are an athletic setup with clean spine tilt and balance, solid arm-body connection in the takeaway, and good wrist hinge creating width and leverage. The main things to clean up over the next few weeks are transition timing, shallowing the downswing slightly, and keeping the pivot centered through impact. Use the checkpoints and practice plan below to work through this step-by-step.",
      highlights: [
        "Athletic, balanced setup that supports a powerful coil.",
        "Good wrist hinge and width in the backswing.",
        "Clubface control is generally very good through impact.",
        "Transition timing can get a touch upper-body dominant.",
        "Low point control can tighten up for more compression."
      ],
      tags: ["Right hand", "Right eye", "Hcp 1", "6'0\"", "Generated by Virtual Coach AI"],
      footer:
        "High level amateur right-handed golfer with right eye dominance and good athletic build, swinging a mid-iron.",
      recommendations: ["Transition timing", "Low point control"],
      recHowto: [
        "Start the downswing by shifting pressure into your lead foot before the hands move. Let the body lead and the arms respond.",
        "Keep your chest over the ball through impact and practice brushing the turf just in front of the ball."
      ]
    };
const [error, setError] = useState<string | null>(null);

  const [dictKey, setDictKey] = useState<keyof typeof DICTIONARY | null>(null);

  // ✅ click test so you KNOW the handler is firing
  const [clickTest, setClickTest] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [curTime, setCurTime] = useState<number>(0);
  const fps = 30;

  const frames = data?.media?.frames ?? [];
  const sortedFrames = useMemo(() => [...frames].sort((a, b) => a.p - b.p), [frames]);
  function resetDemo() {
    // Bulletproof reset: clears UI state without waiting on network
    try { setData(null); } catch {}
    try { setError(null); } catch {}
    try { setRunStatus(""); } catch {}
    try { setRunErr(""); } catch {}
    try { setRunState("idle"); } catch {}

    // common UI state (safe if these exist)
    try { setActiveP(1); } catch {}
    try { setCurTime(0); } catch {}
    try { setLoading(false); } catch {}

    // if you track click tests or other debug counters
    try { setClickTest(0 as any); } catch {}

    // scroll back up so the user sees a clean slate
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
  }

  async function analyze() {
    // CLICK TEST — if this number bumps, the button is NOT “dead”
    setClickTest((n) => n + 1);

    console.log("🟦 Analyze clicked", { videoUrl, impactFrame, level, t: Date.now() });

    setLoading(true);
    setError(null);
    setData(null);
    setRunStatus("Starting analysis…");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoUrl, impactFrame, level }),
      });

      setRunStatus("Response: " + res.status + " " + res.statusText);

      const text = await res.text();

      let json: AnalyzeResponse | null = null;
      if (text) {
        try {
          json = JSON.parse(text) as AnalyzeResponse;
        } catch {
          throw new Error("Invalid JSON from server");
        }
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Analyze failed (${res.status})`);
      }

      const frames = (json as any)?.media?.frames ?? (json as any)?.frames ?? [];
      const framesDir = (json as any)?.media?.framesDir ?? (json as any)?.framesDir ?? "";

      setData({
        ...(json as any),
        media: { ...((json as any)?.media ?? {}), framesDir, frames },
      } as any);

      setRunStatus("Done. Frames + report loaded ✅");
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e: any) {
      setRunStatus("❌ Analyze error");
      setError(e?.message || "Analyze failed");
      console.error("❌ analyze() failed:", e);
    } finally {
      setLoading(false);
    }
  }
  function jumpToP(p: number) {
    
    try { setActiveP(p); } catch {}
const f = sortedFrames.find((x) => x.p === p);
    if (!f) return;

    const t = f.frame / fps;
    const v = videoRef.current;
    if (!v) return;

    v.currentTime = t;
    v.pause();
    setCurTime(t);
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
          "Solid balance through the motion - that's your foundation",
          "Tempo is consistent; keep that and you'll keep the strike",
          "Impact looks organized: hands and body arriving together",
        ],
      improve:
        n?.improve ?? [
          "Pick ONE priority today and win it (face control OR low point)",
          "Give me 5 clean reps before you speed up - clean beats fast",
          "Film 2 swings after the drill: if the picture improves, keep it",
        ],
      powerLeaks:
        n?.powerLeaks ?? [
          "If the chest stalls, the hands flip - keep rotating through",
          "Pressure must shift THEN you rotate (don't spin in place)",
          "Finish tall and posted; if you're falling back, you're leaking power",
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
{/* VCA_SWING_FACTS_CARD */}
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900 }}>Virtual Coach AI</div>
            <div style={{ opacity: 0.75, marginTop: 4 }}>
              Upload once. Get frames, scores, and coaching that makes sense.
            </div>
          </div>
          <a href="/" style={{ color: "#b9cff6", textDecoration: "none", fontWeight: 700 }}>
            ← Home
          </a>
        </div>

        



<Card>
  <div style={{ fontSize: 12, letterSpacing: 1, opacity: 0.7, marginBottom: 6 }}>
    PLAYER OVERVIEW
  </div>

  <div style={{ fontSize: 15, lineHeight: 1.6 }}>
    {narrative?.summary ??
      "This swing shows solid fundamentals with good intent through impact. The priority is improving the transition so power and consistency improve together."}
  </div>
</Card>

<Card title="Swing Report — Beta">
  
          {/* ===== VCA_CONF_UI_START ===== */}
          {(() => {
            const focus = intake?.focus || "";
            // Use intake focus if present; fall back to focusTopic state if you already have it.
            const faults = (typeof inferFaultsFromFocus === "function"
              ? (inferFaultsFromFocus(focus || (typeof focusTopic === "string" ? focusTopic : "")) as any)
              : []) as FaultKey[];

            const sessions = (typeof window !== "undefined" && (window as any).__vca_sessions) ? (window as any).__vca_sessions : 0;
            const conf = computeConfidence({ faults, sessions });

            const rx = prescribe({ faults, level: (level as any) ?? "intermediate", junior: intake?.audience === "junior" });
            return (
              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
{/* VCA_SWING_FACTS_CARD */}
                <TinyCard title="Confidence Progress Meter">
                  <ConfidenceMeter
                    label="Confidence Graph Over Time"
                    phase={conf.phase}
                    trend={conf.trend}
                    score={conf.score}
                    note={conf.note}
                  />
                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        (window as any).__vca_sessions = ((window as any).__vca_sessions || 0) + 1;
                        // quick refresh without state surgery
                        location.reload();
                      }}
                      style={{
                        height: 40,
                        padding: "0 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(230,237,246,0.90)",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                      title="Demo: simulates another practice session"
                    >
                      +1 Session (demo)
                    </button>
                    <div style={{ fontSize: 12, opacity: 0.75, alignSelf: "center" }}>
                      Sessions: {sessions}
                    </div>
                  </div>
                </TinyCard>

                <TinyCard title="Automatic Drill Prescription">
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
                    Based on your focus + swing profile, here’s the fastest way out of the gap.
                  </div>

                  {rx.map((p) => (
                    <div key={p.fault} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ fontWeight: 900 }}>{p.drill.title}</div>
                      <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                        <b>Body requirement:</b> {p.bodyRequirement}
                      </div>
                      <ul style={{ margin: "8px 0 0 18px", padding: 0, lineHeight: 1.55, fontSize: 12, opacity: 0.9 }}>
                        {p.drill.how.slice(0, 3).map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                      <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
                        <b>Reps:</b> {p.drill.reps}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
                        <b>On-course cue:</b> “{p.drill.onCourseCue}”
                      </div>
                    </div>
                  ))}
                </TinyCard>
              </div>
            );
          })()}
          {/* ===== VCA_CONF_UI_END ===== */}
<div style={{ display: "grid", gap: 12 }}>
    {/* Row 1: primary actions */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* MVP breadcrumb */}
        <div style={{ gridColumn: "1 / -1", fontSize: 12, opacity: 0.8, margin: "8px 0 10px" }}>
          <span style={{ fontWeight: stepName(runState)==="Upload" ? 800 : 400 }}>Upload</span>
          {"  →  "}
          <span style={{ fontWeight: stepName(runState)==="Analyze" ? 800 : 400 }}>Analyze</span>
          {"  →  "}
          <span style={{ fontWeight: stepName(runState)==="Report" ? 800 : 400 }}>Report</span>
          {runState==="error" && runErr ? (
            <span style={{ marginLeft: 10, fontWeight: 800 }}>⚠ {runErr}</span>
          ) : null}
        </div>

      <button
        type="button"
        onClick={analyze}
        disabled={loading}
        style={{
          height: 46,
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

      <button
        type="button"
        onClick={resetDemo}
        disabled={loading}
        style={{
          height: 46,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.92)",
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        Reset Demo
      </button>
    </div>

    {/* Row 2: key options */}
    <div style={{
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr 1fr",
  gap: 12,
  alignItems: "end",
  padding: 12,
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)"
}}>
      <div>
        <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900, marginBottom: 6 }}>Level</div>
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
            fontWeight: 700,
          }}
        >
          <option value="beginner">Beginner (simple)</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="teacher">Teacher (technical)</option>
        </select>
        <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>{LEVEL_HELP[level]}</div>
      </div>

      <div>
        <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900, marginBottom: 6 }}>Impact</div>
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
        <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900, marginBottom: 6 }}>Focus (optional)</div>
        <select
          value={focusTopic}
          onChange={(e) => setFocusTopic(e.target.value)}
          style={{
            width: "100%",
            height: 42,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.22)",
            color: "#e6edf6",
            padding: "0 12px",
            outline: "none",
          }}
        >
          {focusOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* Row 3: calm extras (collapsed) */}
    <div style={{ display: "grid", gap: 8 }}>
      <Collapsible title="Ask the Coach (optional)" defaultOpen={false}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end", marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8, marginBottom: 6 }}>Question</div>
            <input
              value={coachQuestion}
              onChange={(e) => setCoachQuestion(e.target.value)}
              placeholder='e.g., "What is my right elbow doing?"'
              style={{
                width: "100%",
                height: 42,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.22)",
                color: "#e6edf6",
                padding: "0 12px",
                outline: "none",
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => alert("🎤 Voice is coming soon. For now, type your question.")}
            style={{
              height: 42,
              padding: "0 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(230,237,246,0.85)",
              cursor: "pointer",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
            title="Coming soon"
          >
            🎤 Voice (soon)
          </button>
        </div>
      </Collapsible>

      <Collapsible title="Help (terms)" defaultOpen={false}>
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <PillButton onClick={() => setDictKey("safe hallway")}>Safe hallway</PillButton>
          <PillButton onClick={() => setDictKey("hand path")}>Hand path</PillButton>
          <PillButton onClick={() => setDictKey("lead arm")}>Lead arm</PillButton>
        </div>
      </Collapsible>

      <Collapsible title="Advanced" defaultOpen={false}>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900, marginBottom: 6 }}>Video URL</div>
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
        </div>
      </Collapsible>

      {runStatus ? (
        <div style={{ marginTop: 2, fontSize: 12, opacity: 0.75 }}>
          <b>Status:</b> {runStatus}
        </div>
      ) : null}

      {/* P1–P9 descriptions (collapsed) */}
      <PDescriptionsCollapsed onJumpToP={jumpToP} activeP={activeP} />

      {error && (
        <div
          style={{
            marginTop: 8,
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,80,80,0.35)",
            background: "rgba(255,80,80,0.08)",
          }}
        >
          <div style={{ fontWeight: 900, color: "#ffb4b4" }}>Error</div>
          <div style={{ opacity: 0.9, marginTop: 4 }}>{error}</div>
        </div>
      )}
    </div>
  </div>
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
              src={videoUrl || undefined}
              controls
              playsInline
              preload="metadata"
              style={{
                width: "100%",
                borderRadius: 14,
                background: "#000",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
              onLoadedMetadata={(e) => setDuration((e.currentTarget as HTMLVideoElement).duration || 0)}
              onTimeUpdate={(e) => setCurTime((e.currentTarget as HTMLVideoElement).currentTime || 0)}
            />

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <PillButton onClick={() => stepFrames(-1)} disabled={!duration}>
                  ◀︎ 1 frame
                </PillButton>
                <PillButton onClick={() => stepFrames(+1)} disabled={!duration}>
                  1 frame ▶︎
                </PillButton>
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
                  if (v) {
                    v.currentTime = t;
                    v.pause();
                  }
                  setCurTime(t);
                }}
              />

              <div style={{ fontSize: 12, opacity: 0.75, fontVariantNumeric: "tabular-nums" }}>
                {curTime.toFixed(2)}s / {duration ? duration.toFixed(2) : "—"}s
              </div>
            </div>

            <div style={{ marginTop: 12, fontWeight: 900, opacity: 0.92 }}>P1–P9 frames</div>

            {!sortedFrames.length ? (
              <div style={{ opacity: 0.75, marginTop: 6 }}>Run Analyze to populate frames.</div>
            ) : (
              <>
                <div style={{ marginTop: 10 }}>
                  {/* P1–P9 frame thumbnails hidden (optional feature) */}
                </div>

                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(9, minmax(0, 1fr))", gap: 8 }}>
                  {sortedFrames.map((f) => (
                    <button
                      type="button"
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
                      <img
                        src={f.thumbUrl || f.imageUrl}
                        alt={f.label}
                        style={{ width: "100%", display: "block", aspectRatio: "16/9", objectFit: "cover" }}
                      />
                    </button>
                  ))}
                </div>
              </>
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
                  <div
                    key={k as string}
                    style={{
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 14,
                      padding: 12,
                      background: "rgba(0,0,0,0.18)",
                    }}
                  >
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

            <Card>
  <Collapsible title="3 things you do well" defaultOpen={true}>
<ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9, lineHeight: 1.6 }}>
                {narrative.good.slice(0, 3).map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>

<div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75, marginBottom: 6 }}>
  </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
        </div>

        <ol style={{ paddingLeft: 18, margin: 0 }}>
          {recommendations.map((r, i) => (
            <li key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>{r.title}</div>
              <div style={{ opacity: 0.8, fontSize: 12, marginTop: 3, lineHeight: 1.35 }}>
                {r.how}
              </div>
            </li>
          ))}
        </ol>
      </div>
  <ol style={{ paddingLeft: 18, margin: 0 }}>
    {(data?.narrative?.playerOverview?.recommendations ?? []).slice(0,2).map((r, i) => (
      <li key={i} style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 700 }}>{r}</div>
        <div style={{ opacity: 0.8, fontSize: 12, marginTop: 3, lineHeight: 1.35 }}>
          {(data?.narrative?.playerOverview?.recHowto?.[i]) ?? "Work this in slow reps first, then blend it into full speed."}
        </div>
      </li>
    ))}
  </ol>
</div>
</Collapsible>
</Card>

            <Card>
  <Collapsible title="3 things to improve next" defaultOpen={true}>
<ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9, lineHeight: 1.6 }}>
                {narrative.improve.slice(0, 3).map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>

<div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75, marginBottom: 6 }}>
  </div>
  <ol style={{ paddingLeft: 18, margin: 0 }}>
    {(data?.narrative?.playerOverview?.recommendations ?? []).slice(0,2).map((r, i) => (
      <li key={i} style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 700 }}>{r}</div>
        <div style={{ opacity: 0.8, fontSize: 12, marginTop: 3, lineHeight: 1.35 }}>
          {(data?.narrative?.playerOverview?.recHowto?.[i]) ?? "Work this in slow reps first, then blend it into full speed."}
        </div>
      </li>
    ))}
  </ol>
</div>
</Collapsible>
</Card>

            <Card>
  <Collapsible title="3 possible power leaks" defaultOpen={false}>
<ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9, lineHeight: 1.6 }}>
                {narrative.powerLeaks.slice(0, 3).map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>

<div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75, marginBottom: 6 }}>
  </div>
  <ol style={{ paddingLeft: 18, margin: 0 }}>
    {(data?.narrative?.playerOverview?.recommendations ?? []).slice(0,2).map((r, i) => (
      <li key={i} style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 700 }}>{r}</div>
        <div style={{ opacity: 0.8, fontSize: 12, marginTop: 3, lineHeight: 1.35 }}>
          {(data?.narrative?.playerOverview?.recHowto?.[i]) ?? "Work this in slow reps first, then blend it into full speed."}
        </div>
      </li>
    ))}
  </ol>
</div>
</Collapsible>
</Card>
          </div>
        </div>

        {dictKey && (
          <div
            onClick={() => setDictKey(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.62)",
              display: "grid",
              placeItems: "center",
              padding: 16,
              zIndex: 50,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(720px, 96vw)",
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(6,10,16,0.95)",
                boxShadow: "0 20px 70px rgba(0,0,0,0.6)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.10)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 900 }}>{DICTIONARY[dictKey].title}</div>
                <button
                  type="button"
                  onClick={() => setDictKey(null)}
                  style={{
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.25)",
                    color: "#e6edf6",
                    padding: "8px 10px",
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
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





