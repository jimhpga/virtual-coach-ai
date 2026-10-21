"use client";
function vcaPickPriorityFault(rankedFaults: any[]) {
  const rf = Array.isArray(rankedFaults) ? rankedFaults : [];
  const top = rf[0] ?? null;
  const conf = typeof top?.confidence === "number" ? top.confidence : 0;
  const ok = conf >= 55;
  return {
    top, conf, ok,
    label: ok ? "PRIORITY FIX" : "VERIFY",
    note: ok ? "" : "Low confidence on the top fault — re-record or add the other angle for best accuracy."
  };
}


import ReadyBundleCoachTools from "../_shared/ReadyBundleCoachTools";
import SwingProofPanel from "../SwingProofPanel";
import ModelSwing3DPanel from "../ModelSwing3DPanel";
import React, { useState } from "react";
import ReportShell from "../_ui/ReportShell";
import { getPPosition, type VcaPPositionId } from "../../../lib/p_positions";

/** VCA_PPOSITION_HELPER
 * Safe lookup for P-position guide text (works even if descriptions are blank).
 */
function vcaPGuide(id: VcaPPositionId){
  const p = getPPosition(id);
  if(!p) return { title: id, desc: "" };
  const desc = (p.description || "").trim();
  const title = (p.title || p.label || id).trim();
  // Fallback text keeps UI usable until gold is pasted.
  const fallback = `Description coming soon. Paste the gold text for ${id} to unlock the full guide.`;
  return { title, desc: desc.length ? desc : fallback };
}
type Fault = { title: string; why: string; fix: string; severity?: "ontrack" | "needs" | "priority" };
type Drill = { name: string; steps: string[]; reps: string };
type PCheck = {
  p: number;
  title: string;
  coachNotes: string[];
  commonMisses: string[];
  drills: string[];
  status: "ontrack" | "needs" | "priority";
};

type FullData = {
  playerName: string;
  overview: string;
  highlights: string[];
  swingScore: number;
  tourDna: string;
  grades: { power: string; speed: string; efficiency: string; consistency: string };
  doingWell: string[];
  leaks: string[];
  topFixes: string[];
  faults: Fault[];
  drills: Drill[];
  pchecks: PCheck[];
  practicePlan: { title: string; subtitle: string; bullets: string[] };
};

const FALLBACK: FullData = {
  playerName: "Player S (demo)",
  overview:
    "Solid fundamentals with small opportunities to clean up transition and low point control. Biggest upside: pressure shift timing and keeping the pivot moving through impact.",
  highlights: [
    "Athletic, balanced setup",
    "Good width + coil in the backswing",
    "Clubface generally stable through impact",
    "Finish is tall and balanced",
  ],
  swingScore: 91,
  tourDna: "Tour DNA Match: Player S (demo)",
  grades: { power: "A-", speed: "B+", efficiency: "A-", consistency: "A-" },
  doingWell: [
    "Athletic setup + posture",
    "Good connection between arms and body",
    "Stable finish and balance",
  ],
  leaks: [
    "Pressure shift is slightly late",
    "Arms can outrun pivot in transition",
    "Early extension under speed",
  ],
  topFixes: [
    "Get lead-side pressure earlier (by P5)",
    "Keep pivot moving through P6-P8",
    "Maintain trail hip depth to protect low point",
  ],
  faults: [
    {
      title: "Early extension (hips toward ball)",
      why: "Handle lifts; contact gets heel-y/thin under speed.",
      fix: "Keep trail hip back; chest stays down through impact.",
      severity: "needs",
    },
    {
      title: "Arms outrun pivot",
      why: "Face timing gets flippy late.",
      fix: "Rotate through; keep hands passive P6-P8.",
      severity: "priority",
    },
  ],
  drills: [
    {
      name: "Wall-Butt Drill",
      steps: [
        "Stand ~6 inches from a wall behind you.",
        "Backswing without losing glute contact.",
        "Downswing: keep trail hip back longer.",
      ],
      reps: "2x8 slow, then 5 swings",
    },
    {
      name: "Towel Under Arms",
      steps: [
        "Place towel under both armpits.",
        "Half swings keeping towel in place.",
        "Rotate chest through; don't throw arms.",
      ],
      reps: "2x10 half swings",
    },
  ],
  pchecks: [
    {
      p: 1,
      title: "Setup",
      coachNotes: ["Balanced, athletic posture with clean alignment."],
      commonMisses: ["Too much knee bend can limit hip turn."],
      drills: ["Mirror setup check (spine tilt, ball position, weight 55/45)."],
      status: "ontrack",
    },
    {
      p: 2,
      title: "Shaft parallel backswing",
      coachNotes: ["Club tracks nicely along the target line."],
      commonMisses: ["Club rolling inside early with too much forearm rotation."],
      drills: ["Low-and-slow takeaway focusing on keeping the triangle."],
      status: "ontrack",
    },
    {
      p: 3,
      title: "Lead arm parallel backswing",
      coachNotes: ["Good depth and rotation; coil potential is strong."],
      commonMisses: ["Trail leg locking early and stalling hip turn."],
      drills: ["Trail hip turn drill (feel knee stays athletic)."],
      status: "ontrack",
    },
    {
      p: 4,
      title: "Top of swing",
      coachNotes: ["Playable club position at the top."],
      commonMisses: ["Across-the-line when rushing backswing."],
      drills: ["Three-count backswing (1-2-3) to control length."],
      status: "ontrack",
    },
    {
      p: 5,
      title: "Lead arm parallel downswing",
      coachNotes: ["Arms are close to on-plane; needs earlier pressure."],
      commonMisses: ["Upper body driving toward ball early."],
      drills: ["Step-through shift to feel lead-side pressure by P5."],
      status: "needs",
    },
    {
      p: 6,
      title: "Shaft parallel downswing",
      coachNotes: ["Face/path playable but timing can spike under speed."],
      commonMisses: ["Handle lifts; trail shoulder dives."],
      drills: ["P6 checkpoint + turn-through (keep pivot moving)."],
      status: "needs",
    },
    {
      p: 7,
      title: "Impact",
      coachNotes: ["Good base; protect low point by staying forward."],
      commonMisses: ["Hanging back / adding loft at the bottom."],
      drills: ["Impact bag: chest forward + hands ahead feel."],
      status: "ontrack",
    },
    {
      p: 8,
      title: "Shaft parallel follow-through",
      coachNotes: ["Arms extend through impact while the body keeps rotating."],
      commonMisses: ["Release stalling while the hands flip past the body."],
      drills: ["Hold P8 for 2 seconds - chest turning, arms extended."],
      status: "ontrack",
    },
    {
      p: 9,
      title: "Trail arm parallel follow-through",
      coachNotes: ["Release continues around the body with balance moving fully lead-side."],
      commonMisses: ["Rotation stopping too early or the club exiting too vertically."],
      drills: ["P9 hold: trail arm extended, chest continuing left around the body."],
      status: "ontrack",
    },
    {
      p: 10,
      title: "Finish",
      coachNotes: ["Tall, fully rotated finish that can be held comfortably."],
      commonMisses: ["Falling back, stepping out, or losing the finish under speed."],
      drills: ["Finish hold: freeze for 3 seconds after every practice swing."],
      status: "ontrack",
    },
  ],
  practicePlan: {
    title: "14-Day Practice Plan",
    subtitle:
      "Next 14 days: lock in pressure shift timing + keep pivot moving through impact.",
    bullets: [
      "Days 1-3: Step-through shift + Wall-Butt drill (slow reps only)",
      "Days 4-7: Add P6 checkpoint + turn-through; 10 filmed reps",
      "Days 8-10: Blend drills into full swings; prioritize start line",
      "Days 11-14: Random practice (targets, clubs); keep one priority only",
    ],
  },
};

function pill(status: "ontrack" | "needs" | "priority") {
  const map: Record<string, { label: string; bg: string; bd: string }> = {
    ontrack: { label: "ON TRACK", bg: "rgba(36, 180, 120, 0.16)", bd: "rgba(36, 180, 120, 0.35)" },
    needs: { label: "NEEDS ATTENTION", bg: "rgba(240, 200, 90, 0.16)", bd: "rgba(240, 200, 90, 0.35)" },
    priority: { label: "PRIORITY FIX", bg: "rgba(255, 110, 110, 0.16)", bd: "rgba(255, 110, 110, 0.35)" },
  };
  const m = map[status];
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid ${m.bd}`,
        background: m.bg,
        fontSize: 11,
        letterSpacing: 0.4,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}

>
      {m.label}
    </span>
  );
}

function Panel(props: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.22)",
        padding: 16,
      }}

> 
      <ReadyBundleCoachTools />

{/* ===== VCA: Confidence Summary (AUTO) ===== */}
{(() => {
  const src: any = (typeof data !== "undefined" ? (data as any) : {});
  const entries = Object.entries(src)
    .filter(([k, v]) => v && typeof v === "object" && (["low_confidence","not_available"] as const).includes((v as any).status))
    .map(([k, v]) => ({ key: k as string, v: v as any }));

  
  const nameMap: Record<string, string> = {
    p5p6p7ShaftArm: "Shaft & Lead Arm Alignment (P5–P7)",
    p3p5Mirror: "Mirror Check (P3–P5)",
    poseSnap: "Pose Snap (P-frames)",
    rankedFaults: "Top Faults (ranked)",
    swingScore: "Swing Score"
  };
  const nice = (k: string) => nameMap[k] ?? k;

  const statusLabel = (s: string) => {
    if (s === "not_available") return "Not available (insufficient tracking)";
    if (s === "low_confidence") return "Low confidence (estimate)";
    return s;
  };if (!entries.length) return null;

  return (
    <div style={{ marginBottom: 12, padding: 12, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" }}>
      <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Confidence Notes</div>
      <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 8 }}>
        Some items below are estimates or unavailable due to tracking limits (camera angle, lighting, or club visibility). The report still works — just treat these as “info with a warning label.”
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {entries.slice(0, 4).map((e) => (
          <div key={nice(e.key)} style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
              <div style={{ fontWeight: 900, fontSize: 12 }}>{nice(e.key)}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Confidence: {e.v.confidenceLabel ?? "Low"}{typeof e.v.confidenceMin === "number" ? ` (${e.v.confidenceMin})` : ""}
              </div>
            </div>

            <div style={{ fontSize: 12, opacity: 0.92, marginTop: 6 }}>
              {e.v.message ?? "Low confidence for this metric."}
            </div>

            {Array.isArray(e.v.nextSteps) && e.v.nextSteps.length > 0 && (
              <ul style={{ margin: "8px 0 0 16px", fontSize: 12, opacity: 0.9 }}>
                {e.v.nextSteps.slice(0, 2).map((t: string, i: number) => <li key={i}>{t}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
})()}
{/* ===== /VCA: Confidence Summary (AUTO) ===== */}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 900 }}>{props.title}</div>
        {props.right}
      </div>
      {props.children}
    </div>
  );
}

function SoftCard(props: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.05)",
      }}

> 
      {props.children}
    </div>
  );
}

function BarRow(props: { label: string; grade: string }) {
  // fake bar length from grade (demo)
  const g = props.grade.toUpperCase();
  const pct =
    g.startsWith("A") ? 0.88 :
    g.startsWith("B") ? 0.72 :
    g.startsWith("C") ? 0.55 :
    0.40;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 40px", gap: 10, alignItems: "center" }}>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{props.label}</div>
      <div style={{ height: 10, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.22)", overflow: "hidden" }}>
        <div style={{ width: `${Math.round(pct * 100)}%`, height: "100%", background: "rgba(120,180,255,0.55)" }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.9, textAlign: "right" }}>{props.grade}</div>
    </div>
  );
}

export default function FullClient() {

  // ---- P1 - P10 collapse state ----

/* VCA_POSITION_GUIDE_UI disabled (was raw JSX outside return) */

  const [openP, setOpenP] = useState<number | null>(7); // default open = P7 (impact sells)
  const [expandAllP, setExpandAllP] = useState(false);

  function toggleP(p: number) {
    if (expandAllP) return; // when expanded, ignore single toggles
    setOpenP((cur) => (cur === p ? null : p));
  }
const [data, setData] = React.useState<FullData>(FALLBACK);
const [muxResolveStatus, setMuxResolveStatus] = React.useState<
  "idle" | "resolving" | "pending" | "ready" | "error"
>("idle");
const [activeReportSource, setActiveReportSource] = React.useState<string>("");
const [reportProvenance, setReportProvenance] = React.useState({
  loaded: false,
  real: false,
  hasPChecks: true,
  hasPracticePlan: true,
});

// ===== VCA_NORM_PCHECKS (AUTO) =====
// Keep the UI stable: prefer pchecks, but accept API contract p_checkpoints and common aliases.
const _pchecks: any[] =
  ((data as any).pchecks ?? (data as any).p_checkpoints ?? (data as any).pCheckpoints ?? (data as any).pChecks ?? (data as any).pchecks ?? []) as any[];
if(!Array.isArray((data as any).pchecks) || ((data as any).pchecks?.length ?? 0) === 0){
  (data as any).pchecks = _pchecks;
}
// ===== /VCA_NORM_PCHECKS (AUTO) =====
  const priority = vcaPickPriorityFault(((data as any)?.rankedFaults) || []);
  const reportId = String((data as any)?.id ?? "");
  const muxUploadId = String((data as any)?.muxUploadId ?? "");
  const muxPlaybackId = String((data as any)?.muxPlaybackId ?? "");
  const directVideoUrl = String((data as any)?.videoUrl ?? "");
  const muxEmbedUrl = muxPlaybackId
    ? `https://player.mux.com/${encodeURIComponent(muxPlaybackId)}`
    : "";
  const analysisStatus = String((data as any)?.analysisStatus ?? "");
  const analysisPending =
    analysisStatus === "queued" || analysisStatus === "queued_retry";
  const analysisFailed = analysisStatus === "analysis_error";
  const analysisRecapture =
    analysisStatus === "invalid_capture" || analysisStatus === "incomplete_swing";
  const showPChecks = !reportProvenance.real || reportProvenance.hasPChecks;
  const showPracticePlan =
    !reportProvenance.real || reportProvenance.hasPracticePlan;

  React.useEffect(() => {
    // Same source logic as card: ?src=, sessionStorage, fallback demo json
    let src = "/data/card-demo.json";
    try {
      const u = new URL(window.location.href);
      const q = u.searchParams.get("src");
      if (q && q.startsWith("/")) src = q;
      const ss = window.sessionStorage.getItem("vca_card_src");
      if (!q && ss && ss.startsWith("/")) src = ss;
    } catch {}
// ---- Source routing (src preferred; jobId fallback) ----
  const qs2 = (typeof window !== "undefined") ? new URLSearchParams(window.location.search) : null;
  const srcQ2 = qs2?.get("src") || "";
  const jobIdQ2 = qs2?.get("jobId") || "";
  // Primary: direct JSON URL. Secondary: explicit jobId. Otherwise use session/demo fallback.
  const fetchSrc = srcQ2 || (jobIdQ2 ? (`/api/job/${encodeURIComponent(jobIdQ2)}`) : src);

if (!fetchSrc) return;
setActiveReportSource(fetchSrc);
fetch(fetchSrc, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        // Accept direct report JSON, { report }, and bundle-backed shapes.
        if (!j) return;
        const root: any = (j as any).report ?? j;
        const bundle: any = root?.bundle ?? (j as any).bundle ?? null;

        const incomingPChecks =
          root.pchecks ??
          root.p_checkpoints ??
          root.pCheckpoints ??
          root.pChecks ??
          null;
        const incomingPractice = root.practicePlan ?? null;
        const looksReal = Boolean(
          root.analysisEngine ||
          root.analysisStatus ||
          root.muxUploadId ||
          root.muxPlaybackId ||
          root.videoUrl ||
          (root.id && !String(root.id).toLowerCase().includes("demo"))
        );
        const noCoaching = Boolean(
          looksReal &&
          ["queued", "queued_retry", "analysis_error", "invalid_capture", "incomplete_swing"].includes(
            String(root.analysisStatus ?? "")
          )
        );

        setReportProvenance({
          loaded: true,
          real: looksReal,
          hasPChecks: Array.isArray(incomingPChecks) && incomingPChecks.length > 0,
          hasPracticePlan: Boolean(
            incomingPractice &&
            Array.isArray(incomingPractice.bullets) &&
            incomingPractice.bullets.length > 0
          ),
        });

        setData((prev) => ({
          ...prev,
          id: (root.id ?? (prev as any).id ?? null),
          analysisStatus: (
            root.analysisStatus ??
            (prev as any).analysisStatus ??
            null
          ),
          analysisEngine: (
            root.analysisEngine ??
            (prev as any).analysisEngine ??
            null
          ),
          muxPlaybackId: (
            root.muxPlaybackId ??
            root.video?.muxPlaybackId ??
            (prev as any).muxPlaybackId ??
            null
          ),
          muxUploadId: (
            root.muxUploadId ??
            root.video?.muxUploadId ??
            (prev as any).muxUploadId ??
            null
          ),
          videoUrl: (
            root.videoUrl ??
            root.video?.url ??
            root.meta?.source?.videoUrl ??
            (prev as any).videoUrl ??
            null
          ),
          swingScore: noCoaching ? null : (root.swingScore ?? prev.swingScore),
          headline: noCoaching ? "" : (root.headline ?? (prev as any).headline ?? ""),
          rankedFaults: noCoaching
            ? []
            : (
                Array.isArray(root.rankedFaults)
                  ? root.rankedFaults
                  : ((prev as any).rankedFaults ?? [])
              ),
          recapture: (root.recapture ?? (prev as any).recapture ?? null),
          poseSnap: (root.poseSnap ?? (prev as any).poseSnap ?? null),
          pose: (root.pose ?? (prev as any).pose ?? null),
          pframes: (
            Array.isArray(root.pframes)
              ? root.pframes
              : ((prev as any).pframes ?? null)
          ),
          p5p6p7ShaftArm: noCoaching
            ? null
            : (
                root.p5p6p7ShaftArm ??
                bundle?.p5p6p7ShaftArm ??
                (prev as any).p5p6p7ShaftArm ??
                null
              ),
          p3p5Mirror: noCoaching
            ? null
            : (
                root.p3p5Mirror ??
                bundle?.p3p5Mirror ??
                (prev as any).p3p5Mirror ??
                null
              ),
          deliveryCard: noCoaching
            ? null
            : (
                root.deliveryCard ??
                bundle?.deliveryCard ??
                (prev as any).deliveryCard ??
                null
              ),
          foWristHandle: noCoaching
            ? null
            : (
                root.foWristHandle ??
                bundle?.foWristHandle ??
                (prev as any).foWristHandle ??
                null
              ),
          readyBundle: noCoaching
            ? null
            : (
                root.readyBundle ??
                bundle?.readyBundle ??
                (prev as any).readyBundle ??
                null
              ),
          playerName: root.playerName ?? prev.playerName,
          overview: noCoaching ? "" : (root.overview ?? prev.overview),
          highlights: noCoaching
            ? []
            : (Array.isArray(root.highlights) ? root.highlights : prev.highlights),
          tourDna: noCoaching ? "" : (root.tourDna ?? prev.tourDna),
          grades: noCoaching ? null : (root.grades ?? prev.grades),
          doingWell: noCoaching
            ? []
            : (Array.isArray(root.doingWell) ? root.doingWell : prev.doingWell),
          leaks: noCoaching
            ? []
            : (Array.isArray(root.leaks) ? root.leaks : prev.leaks),
          topFixes: noCoaching
            ? []
            : (Array.isArray(root.topFixes) ? root.topFixes : prev.topFixes),
          pchecks: noCoaching
            ? []
            : (Array.isArray(incomingPChecks) ? incomingPChecks : prev.pchecks),
          practicePlan: noCoaching ? null : (incomingPractice ?? prev.practicePlan),
          priority: noCoaching ? null : (root.priority ?? prev.priority),
          faults: noCoaching ? [] : (root.faults ?? prev.faults),
          drills: noCoaching ? [] : (root.drills ?? prev.drills),
        } as any));
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!reportId || !muxUploadId || muxPlaybackId) {
      if (muxPlaybackId) setMuxResolveStatus("ready");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      setMuxResolveStatus(attempts === 1 ? "resolving" : "pending");

      try {
        const res = await fetch("/api/resolve-mux", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: reportId, uploadId: muxUploadId }),
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (res.ok && json?.status === "ready" && json?.playbackId) {
          setData((prev) => ({
            ...prev,
            muxPlaybackId: json.playbackId,
            muxUploadId: null,
          } as any));
          setMuxResolveStatus("ready");
          return;
        }

        if (attempts < 15) {
          timer = setTimeout(poll, 2000);
          return;
        }

        setMuxResolveStatus("pending");
      } catch {
        if (attempts < 6) {
          timer = setTimeout(poll, 2000);
        } else {
          setMuxResolveStatus("error");
        }
      }
    };

    timer = setTimeout(poll, 350);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [reportId, muxUploadId, muxPlaybackId]);

  React.useEffect(() => {
    if (!analysisPending || !activeReportSource) return;

    let cancelled = false;
    const pendingStates = new Set(["queued", "queued_retry"]);

    const check = async () => {
      try {
        const res = await fetch(activeReportSource, { cache: "no-store" });
        if (!res.ok || cancelled) return;

        const json = await res.json().catch(() => null);
        if (!json || cancelled) return;

        const root: any = (json as any).report ?? json;
        const nextStatus = String(root?.analysisStatus ?? "");

        if (nextStatus && !pendingStates.has(nextStatus)) {
          window.location.reload();
        }
      } catch {}
    };

    const timer = window.setInterval(check, 3000);
    check();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [analysisPending, activeReportSource]);

  return (
    <ReportShell
      titleTop={reportProvenance.real ? "Virtual Coach AI - Full Report" : "Virtual Coach AI - Full Report (Demo)"}
      rightPills={["Back to home", "Upload another swing", "Print report"]}

>


      {showPChecks && (
      <div style={{ display:"flex", gap:8, margin:"10px 0 14px" }}>
        <button
          type="button"
          onClick={() => { setExpandAllP(true); setOpenP(null); }}
          style={{ height:32, padding:"0 12px", borderRadius:999, border:"1px solid rgba(255,255,255,0.14)", background:"rgba(0,0,0,0.25)", color:"#e6edf6", fontWeight:900, cursor:"pointer", opacity: expandAllP ? 0.7 : 1 }}
        >
          Expand all
        </button>
        <button
          type="button"
          onClick={() => { setExpandAllP(false); setOpenP(7); }}
          style={{ height:32, padding:"0 12px", borderRadius:999, border:"1px solid rgba(255,255,255,0.14)", background:"rgba(0,0,0,0.25)", color:"#e6edf6", fontWeight:900, cursor:"pointer", opacity: !expandAllP ? 0.85 : 1 }}
        >
          Collapse all
        </button>
        <span style={{ fontSize:12, opacity:0.72, alignSelf:"center" }}>Default open: P7 (impact)</span>
      </div>
      )}
      <div style={{
        marginTop: 0,
        marginBottom: 14,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.14)",
      }}>
        <div style={{ fontSize: 12, opacity: 0.82 }}>
          {analysisStatus === "queued"
            ? "Swing uploaded. Analysis is queued and will appear here automatically."
            : analysisStatus === "queued_retry"
              ? "Analysis is retrying automatically. This page will update when it finishes."
              : analysisStatus === "analysis_error"
                ? "Analysis could not complete after multiple attempts. The swing video is still saved."
                : analysisStatus === "invalid_capture"
                  ? "Analysis stopped safely: we could not confirm a visible golfer in this video."
                  : analysisStatus === "incomplete_swing"
                    ? "Analysis stopped safely: the clip does not contain a complete downswing and impact."
                    : analysisStatus === "measured_partial"
                    ? "Measured biomechanics are ready. Coaching conclusions appear only when their source data is available."
                    : "Generated automatically from a single swing video."}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => { try { window.print(); } catch {} }}
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "#eaf1ff",
              fontSize: 12,
              fontWeight: 900,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
>


            Print
          </button>

          <button
            type="button"
            onClick={() => {
              try {
                const url = window.location.href;
                if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url);
              } catch {}
            }}
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "#eaf1ff",
              fontSize: 12,
              fontWeight: 900,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
>


            Copy link
          </button>
        </div>
      </div>

      {(muxEmbedUrl || directVideoUrl || muxUploadId) && (
        <div style={{ marginBottom: 14 }}>
          <Panel
            title="Swing Video"
            right={
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 0.35,
                  textTransform: "uppercase",
                  opacity: 0.72,
                }}
              >
                {muxPlaybackId
                  ? "Ready"
                  : directVideoUrl
                    ? "Ready"
                    : muxResolveStatus === "error"
                      ? "Video still processing"
                      : "Processing in background"}
              </span>
            }
          >
            <div
              style={{
                display: "grid",
                placeItems: "center",
                minHeight: muxEmbedUrl || directVideoUrl ? 0 : 130,
              }}
            >
              {muxEmbedUrl ? (
                <iframe
                  src={muxEmbedUrl}
                  title="Uploaded golf swing"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  style={{
                    width: "100%",
                    maxWidth: 520,
                    aspectRatio: "9 / 16",
                    maxHeight: 620,
                    border: 0,
                    borderRadius: 14,
                    background: "#000",
                  }}
                />
              ) : directVideoUrl ? (
                <video
                  src={directVideoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  style={{
                    width: "100%",
                    maxWidth: 520,
                    maxHeight: 620,
                    display: "block",
                    borderRadius: 14,
                    background: "#000",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <div
                  style={{
                    padding: "22px 18px",
                    textAlign: "center",
                    fontSize: 12,
                    lineHeight: 1.5,
                    opacity: 0.72,
                  }}
                >
                  Your report is ready. The swing video is finishing Mux processing and
                  will appear here automatically.
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* TOP ROW: Overview + Power/Reliability like screenshot */}
      <div style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 14, marginBottom: 14 }}>
        {showPChecks && (
        <Panel
  title="P1 - P10 Checkpoints"
  right={
    <>
      <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12, opacity: 0.85, flexWrap: "wrap" }}>
        <span style={{ opacity: 0.7 }}>Legend:</span>
        {pill("ontrack")} {pill("needs")} {pill("priority")}
      </div>
      <div style={{ display:"flex", gap:8, margin:"2px 0 12px", flexWrap:"wrap" }}>
        <button
          type="button"
          onClick={() => { setExpandAllP(true); setOpenP(null); }}
          style={{ height:32, padding:"0 12px", borderRadius:999, border:"1px solid rgba(255,255,255,0.14)", background:"rgba(0,0,0,0.25)", color:"#e6edf6", fontWeight:900, cursor:"pointer", opacity: expandAllP ? 0.7 : 1 }}
        >
          Expand all
        </button>
        <button
          type="button"
          onClick={() => { setExpandAllP(false); setOpenP(7); }}
          style={{ height:32, padding:"0 12px", borderRadius:999, border:"1px solid rgba(255,255,255,0.14)", background:"rgba(0,0,0,0.25)", color:"#e6edf6", fontWeight:900, cursor:"pointer", opacity: !expandAllP ? 0.85 : 1 }}
        >
          Collapse all
        </button>
        <span style={{ fontSize:12, opacity:0.72, alignSelf:"center" }}>Default open: P7 (impact)</span>
      </div>
    </>
  }
>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0, 1fr))", gap: 12 }}>
          {data.pchecks.map((c) => {
            const isOpen = expandAllP || openP === c.p;
            return (
              <div key={c.p} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.14)", overflow:"hidden" }}>
                <button
                  type="button"
                  title={`P${c.p} — ${c.desc ?? ""}`} /* VCA_PCHECKPOINT_HOVER */
                  onClick={() => { if (!expandAllP) setOpenP((cur) => (cur === c.p ? null : c.p)); }}
                  style={{
                    width:"100%",
                    textAlign:"left",
                    padding:"10px 12px",
                    display:"flex",
                    justifyContent:"space-between",
                    alignItems:"center",
                    gap:10,
                    cursor: expandAllP ? "default" : "pointer",
                    background:"transparent",
                    border:"none",
                    color:"#eaf1ff"
                  }}
                  title={expandAllP ? "Expanded" : "Tap to expand / collapse"}
                  >
                  <div style={{ display:"flex", gap:10, alignItems:"baseline" }}>
                    <div style={{ fontWeight: 950 }}>P{c.p}</div>
                    <div style={{ fontSize: 13, opacity: 0.92, fontWeight: 850 }}>{c.title}</div>
                  </div>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    {pill((c as any).status ?? (c.p === 7 ? "priority" : "needs"))}
                    <span style={{ fontSize: 12, opacity: 0.75 }}>{isOpen ? "▾" : "+"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div style={{ padding:"0 12px 12px" }}>
                    <div style={{ display:"grid", gap:10 }}>
                      <SoftCard>
                        <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Coach Notes</div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.92, lineHeight: 1.55 }}>
                          {(c.coachNotes ?? []).map((x, i) => <li key={i}>{x}</li>)}
                        </ul>
                      </SoftCard>

                      <SoftCard>
                        <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Common Misses</div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.92, lineHeight: 1.55 }}>
                          {(c.commonMisses ?? []).map((x, i) => <li key={i}>{x}</li>)}
                        </ul>
                      </SoftCard>

                      <SoftCard>
                        <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Key Drills</div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.92, lineHeight: 1.55 }}>
                          {(c.drills ?? []).map((x, i) => <li key={i}>{x}</li>)}
                        </ul>
                      </SoftCard>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
      )}

      {/* PRACTICE PLAN */}
      {showPracticePlan && (
      <div style={{ marginTop: 14 }}>
        <Panel title={data.practicePlan.title} right={<span style={{ fontSize: 12, opacity: 0.75 }}>Show full plan</span>}>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>{data.practicePlan.subtitle}</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, opacity: 0.92, lineHeight: 1.6 }}>
            {data.practicePlan.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </Panel>
      </div>
      )}
      </div>

      {analysisPending ? (
        <Panel title="Swing Analysis">
          <div
            style={{
              padding: "22px 8px",
              textAlign: "center",
              fontSize: 14,
              lineHeight: 1.6,
              opacity: 0.86,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>
              Analyzing your swing…
            </div>
            <div>
              Pose, P1–P10 timing, club delivery and confidence checks are running.
              This report updates automatically.
            </div>
          </div>
        </Panel>
      ) : analysisRecapture ? (
        <Panel title="Recapture Required">
          <div
            style={{
              padding: "20px 8px",
              fontSize: 13,
              lineHeight: 1.6,
              opacity: 0.9,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>
              No biomechanics were generated from this clip.
            </div>
            <div>
              {(data as any)?.recapture?.message ??
                "Upload the original swing video with the full golfer visible from setup through early follow-through."}
            </div>
          </div>
        </Panel>
      ) : analysisFailed ? (
        <Panel title="Swing Analysis">
          <div
            style={{
              padding: "20px 8px",
              fontSize: 13,
              lineHeight: 1.6,
              opacity: 0.86,
            }}
          >
            The analysis worker could not complete this swing after multiple
            attempts. Your uploaded video is still available; no biomechanics
            were fabricated.
          </div>
        </Panel>
      ) : (
        <ModelSwing3DPanel
          playerPose={(data as any)?.pose ?? null}
          playerShaft={(data as any)?.p5p6p7ShaftArm ?? null}
          deliveryCard={(data as any)?.deliveryCard ?? null}
          foWristHandle={(data as any)?.foWristHandle ?? null}
          playerPFrames={(data as any)?.pframes ?? null}
        />
      )}

      <div style={{ marginTop: 10, fontSize: 11, opacity: 0.55, textAlign: "center" }}>
        {reportProvenance.real
          ? "Virtual Coach AI • measured where the source data supports it; estimates are labeled."
          : "Virtual Coach AI - demo report. If something doesn't fit, it may be your swing or your feel and your hand."}
      </div>
    </ReportShell>
  );
}










