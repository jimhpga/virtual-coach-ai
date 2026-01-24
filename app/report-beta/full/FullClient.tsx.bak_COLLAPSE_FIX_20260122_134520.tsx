"use client";
import React, { useState } from "react";
import ReportShell from "../_ui/ReportShell";

type Fault = { title: string; why: string; fix: string; severity?: "ontrack" | "needs" | "priority" };
type Drill = { name: string; steps: string[]; reps: string };
type PCheck = {
  p: number;
  title: string;
  coachNotes: string[];
  commonMisses: string[];
  keyDrills: string[];
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
    "Keep pivot moving through P6–P8",
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
      fix: "Rotate through; keep hands passive P6–P8.",
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
        "Rotate chest through; don’t throw arms.",
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
      keyDrills: ["Mirror setup check (spine tilt, ball position, weight 55/45)."],
      status: "ontrack",
    },
    {
      p: 2,
      title: "Shaft parallel backswing",
      coachNotes: ["Club tracks nicely along the target line."],
      commonMisses: ["Club rolling inside early with too much forearm rotation."],
      keyDrills: ["Low-and-slow takeaway focusing on keeping the triangle."],
      status: "ontrack",
    },
    {
      p: 3,
      title: "Lead arm parallel backswing",
      coachNotes: ["Good depth and rotation; coil potential is strong."],
      commonMisses: ["Trail leg locking early and stalling hip turn."],
      keyDrills: ["Trail hip turn drill (feel knee stays athletic)."],
      status: "ontrack",
    },
    {
      p: 4,
      title: "Top of swing",
      coachNotes: ["Playable club position at the top."],
      commonMisses: ["Across-the-line when rushing backswing."],
      keyDrills: ["Three-count backswing (1–2–3) to control length."],
      status: "ontrack",
    },
    {
      p: 5,
      title: "Lead arm parallel downswing",
      coachNotes: ["Arms are close to on-plane; needs earlier pressure."],
      commonMisses: ["Upper body driving toward ball early."],
      keyDrills: ["Step-through shift to feel lead-side pressure by P5."],
      status: "needs",
    },
    {
      p: 6,
      title: "Shaft parallel downswing",
      coachNotes: ["Face/path playable but timing can spike under speed."],
      commonMisses: ["Handle lifts; trail shoulder dives."],
      keyDrills: ["P6 checkpoint + turn-through (keep pivot moving)."],
      status: "needs",
    },
    {
      p: 7,
      title: "Impact",
      coachNotes: ["Good base; protect low point by staying forward."],
      commonMisses: ["Hanging back / adding loft at the bottom."],
      keyDrills: ["Impact bag: chest forward + hands ahead feel."],
      status: "ontrack",
    },
    {
      p: 8,
      title: "Trail arm parallel follow-through",
      coachNotes: ["Extension is improving; keep rotation continuous."],
      commonMisses: ["Arms outracing the body and flipping."],
      keyDrills: ["Hold P8 for 2 seconds—feel balanced extension."],
      status: "ontrack",
    },
    {
      p: 9,
      title: "Finish",
      coachNotes: ["Tall, balanced finish with chest to target."],
      commonMisses: ["Falling back toward toes/heels."],
      keyDrills: ["Finish holds (3 seconds) after every practice swing."],
      status: "ontrack",
    },
  ],
  practicePlan: {
    title: "14-Day Practice Plan",
    subtitle:
      "Next 14 days: lock in pressure shift timing + keep pivot moving through impact.",
    bullets: [
      "Days 1–3: Step-through shift + Wall-Butt drill (slow reps only)",
      "Days 4–7: Add P6 checkpoint + turn-through; 10 filmed reps",
      "Days 8–10: Blend drills into full swings; prioritize start line",
      "Days 11–14: Random practice (targets, clubs); keep one priority only",
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

  // ---- P1–P9 collapse state ----
  const [openP, setOpenP] = useState<number | null>(7); // default open = P7 (impact sells)
  const [expandAllP, setExpandAllP] = useState(false);

  function toggleP(p: number) {
    if (expandAllP) return; // when expanded, ignore single toggles
    setOpenP((cur) => (cur === p ? null : p));
  }
const [data, setData] = React.useState<FullData>(FALLBACK);

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
    fetch(src, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        // If someone passes card JSON (score/tourDna/faults/drills), keep full fallback but inject what exists
        if (!j) return;
        setData((prev) => ({
          ...prev,
          swingScore: j.swingScore ?? prev.swingScore,
          tourDna: j.tourDna ?? prev.tourDna,
          priority: j.priority ?? prev.priority,
          faults: j.faults ?? prev.faults,
          drills: j.drills ?? prev.drills,
        }));
      })
      .catch(() => {});
  }, []);

  return (
    <ReportShell
      titleTop="Virtual Coach AI — Full Report (Demo)"
      titleMain="Player Overview + P1–P9 Checkpoints"
      rightPills={["Back to home", "Upload another swing", "Print report"]}
    >
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
</div>
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
          Generated automatically from a single swing video in under 30 seconds.
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
      {/* TOP ROW: Overview + Power/Reliability like screenshot */}
      <div style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 14, marginBottom: 14 }}>
        <Panel title="Player Overview" right={<span style={{ fontSize: 12, opacity: 0.75 }}>Generated by Virtual Coach AI</span>}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>{data.playerName}</div>
          <div style={{ fontSize: 13, opacity: 0.92, lineHeight: 1.45 }}>
            {data.overview}
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.9, marginBottom: 8 }}>Quick Highlights</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, opacity: 0.92, lineHeight: 1.55 }}>
              {data.highlights.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, opacity: 0.7 }}>RIGHT HAND</span>
            <span style={{ fontSize: 11, opacity: 0.7 }}>RIGHT EYE</span>
            <span style={{ fontSize: 11, opacity: 0.7 }}>HCP 6</span>
            <span style={{ fontSize: 11, opacity: 0.7 }}>6'0"</span>
          </div>
        </Panel>

        <Panel title="Power & Reliability" right={<span style={{ fontSize: 12, opacity: 0.75 }}>Grades</span>}>
          <div style={{ display: "grid", gap: 10 }}>
            <BarRow label="Power" grade={data.grades.power} />
            <BarRow label="Speed" grade={data.grades.speed} />
            <BarRow label="Efficiency" grade={data.grades.efficiency} />
            <BarRow label="Consistency" grade={data.grades.consistency} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
            <SoftCard>
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>What you’re doing well</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.9, lineHeight: 1.55 }}>
                {data.doingWell.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </SoftCard>

            <SoftCard>
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Where you leak power</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.9, lineHeight: 1.55 }}>
                {data.leaks.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </SoftCard>

            <SoftCard>
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Top 3 fixes</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.9, lineHeight: 1.55 }}>
                {data.topFixes.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </SoftCard>
          </div>
        </Panel>
      </div>

      {/* SECOND ROW: Score + DNA + Priority + Faults/Drills */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, marginBottom: 14 }}>
        <Panel title="Score + Tour DNA" right={<span style={{ fontSize: 12, opacity: 0.75 }}>{data.tourDna}</span>}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Swing Score</div>
            <div style={{ fontSize: 44, fontWeight: 950, lineHeight: 1 }}>{data.swingScore}</div>
          </div>

          <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>Today’s priority</div>
            <SoftCard>
              <div style={{ fontWeight: 900 }}>{data.priority}</div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
                Own the pattern first. Speed earns permission.
              </div>
            </SoftCard>
          </div>
        </Panel>

        <div style={{ display: "grid", gap: 14 }}>
          <Panel title="Top 2 Faults (from this swing)" right={<span style={{ fontSize: 12, opacity: 0.7 }}>Auto-ranked</span>}>
            <div style={{ display: "grid", gap: 10 }}>
              {data.faults.slice(0, 2).map((f, i) => (
                <SoftCard key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 950 }}>{i + 1}. {f.title}</div>
                    {pill(f.severity ?? "needs")}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.92, marginTop: 6 }}><b>Why:</b> {f.why}</div>
                  <div style={{ fontSize: 13, opacity: 0.92, marginTop: 6 }}><b>Fix:</b> {f.fix}</div>
                </SoftCard>
              ))}
            </div>
          </Panel>

          <Panel title="2 Drills (Efficient)" right={<span style={{ fontSize: 12, opacity: 0.7 }}>Best ROI</span>}>
            <div style={{ display: "grid", gap: 10 }}>
              {data.drills.slice(0, 2).map((d, i) => (
                <SoftCard key={i}>
                  <div style={{ fontWeight: 950 }}>{d.name}</div>
                  <ol style={{ margin: "8px 0 8px 18px", opacity: 0.92, fontSize: 13 }}>
                    {d.steps.map((s, j) => <li key={j} style={{ marginBottom: 4 }}>{s}</li>)}
                  </ol>
                  <div style={{ fontSize: 13, opacity: 0.92 }}><b>Reps:</b> {d.reps}</div>
                </SoftCard>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* P1–P9 CHECKPOINTS */}
      <Panel
        title="P1–P9 Checkpoints"
        right={
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12, opacity: 0.85 }}>
            <span style={{ opacity: 0.7 }}>Legend:</span>
            {pill("ontrack")} {pill("needs")} {pill("priority")}
          </div>
        }
      >
        <div style={{ display: "grid", gap: 10 }}>
          {data.pchecks.map((pc) => (
            <div
              key={pc.p}
              style={{
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.18)",
                padding: 14,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "70px 1fr auto", gap: 10, alignItems: "center" }}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 950,
                  }}
                >
                  P{pc.p}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 950 }}>{pc.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                    Coach notes, common misses, and key drills for this phase.
                  </div>
                </div>
                {pill(pc.status)}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr 1fr", gap: 10, marginTop: 12 }}>
                <SoftCard>
                  <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Coach Notes</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.92, lineHeight: 1.55 }}>
                    {pc.coachNotes.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <span style={{ padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", fontSize: 11 }}>AI notes</span>
                    <span style={{ padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", fontSize: 11 }}>Need more info</span>
                    <span style={{ padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", fontSize: 11 }}>YouTube</span>
                  </div>
                </SoftCard>

                <SoftCard>
                  <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Common Misses</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.92, lineHeight: 1.55 }}>
                    {pc.commonMisses.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </SoftCard>

                <SoftCard>
                  <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Key Drills</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.92, lineHeight: 1.55 }}>
                    {pc.keyDrills.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                  <div style={{ marginTop: 10, fontSize: 11, opacity: 0.7 }}>
                    Powered by AI wording · Keep one priority at a time.
                  </div>
                </SoftCard>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* PRACTICE PLAN */}
      <div style={{ marginTop: 14 }}>
        <Panel title={data.practicePlan.title} right={<span style={{ fontSize: 12, opacity: 0.75 }}>Show full plan</span>}>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>{data.practicePlan.subtitle}</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, opacity: 0.92, lineHeight: 1.6 }}>
            {data.practicePlan.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </Panel>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, opacity: 0.55, textAlign: "center" }}>
        Virtual Coach AI — demo report. If something doesn’t fit, it may be your swing… or your feel and your hand.
      </div>
    </ReportShell>
  );
}







