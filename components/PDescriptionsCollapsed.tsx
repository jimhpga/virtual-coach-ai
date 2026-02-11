import React, { useState, useEffect } from "react";
"use client";


type Props = {
  onJumpToP?: (p: number) => void;
  activeP?: number;
};

const P_DESCS: Array<{ p: number; title: string; bullets: string[] }> = [
  { p: 1, title: "P1 — Setup / Address", bullets: [
    "Athletic posture, neutral spine, balanced pressure",
    "Grip + face square to target line",
    "Ball position + alignment match the club"
  ]},
  { p: 2, title: "P2 — Shaft Parallel (Backswing)", bullets: [
    "Clubhead stays outside hands early (no snatch inside)",
    "Face control: not rolled open or shut",
    "Chest + arms move together (one-piece start)"
  ]},
  { p: 3, title: "P3 — Lead Arm Parallel", bullets: [
    "Hands in front of chest (not trapped behind)",
    "Trail elbow begins to fold naturally (no flying)",
    "Pressure moving into trail side without sway"
  ]},
  { p: 4, title: "P4 — Top of Swing", bullets: [
    "Full turn without losing posture",
    "Lead wrist organized (controls face)",
    "Trail arm supports: elbow points down-ish, not behind you"
  ]},
  { p: 5, title: "P5 — Down to Lead Arm Parallel", bullets: [
    "Lower body starts first (shift then turn)",
    "Arms fall in front (no over-the-top)",
    "Face and path are ‘married’ (no panic flip needed)"
  ]},
  { p: 6, title: "P6 — Shaft Parallel (Downswing)", bullets: [
    "Handle leading, club shallow enough to approach from inside",
    "Chest opening while staying in posture",
    "Pressure clearly favoring lead side"
  ]},
  { p: 7, title: "P7 — Impact", bullets: [
    "Forward shaft lean (with irons), stable face",
    "Lead leg braced, hips open, chest slightly open",
    "Low point forward of the ball (compress then turf)"
  ]},
  { p: 8, title: "P8 — Shaft Parallel (Post-Impact)", bullets: [
    "Arms extend through the strike (no chicken wing)",
    "Face rotation matches body rotation (no stall + flip)",
    "Pressure fully into lead side"
  ]},
  { p: 9, title: "P9 — Finish", bullets: [
    "Balanced, tall finish (hold it)",
    "Belt buckle + chest to target",
    "No falling back / spinning out"
  ]},
];

export function PDescriptionsCollapsed({ onJumpToP, activeP }: Props) {
  
  // --- Collapsible per-checkpoint UI state ---
  const [openP, setOpenP] = useState<number | null>(null);
const [expandAll, setExpandAll] = useState(false);

  useEffect(() => {
    if (typeof activeP === "number" && !expandAll) setOpenP(activeP);
  }, [activeP, expandAll]);
  // ------------------------------------------

return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.18)",
        borderRadius: 16,
        padding: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>P1–P10 Descriptions</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => { setExpandAll(true); setOpenP(null); }}
            style={{
              height: 30, padding: "0 10px", borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.25)", color: "#e6edf6",
              fontSize: 12, fontWeight: 900, cursor: "pointer",
              opacity: expandAll ? 0.65 : 1
            }}
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => { setExpandAll(false); setOpenP(typeof activeP === "number" ? activeP : null); }}
            style={{
              height: 30, padding: "0 10px", borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.25)", color: "#e6edf6",
              fontSize: 12, fontWeight: 900, cursor: "pointer",
              opacity: !expandAll ? 0.75 : 1
            }}
          >
            Collapse all
          </button>
        </div>
      </div>

      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
        Click a checkpoint to expand it. Active checkpoint highlights automatically.
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {P_DESCS.map((row) => {
          const isActive = typeof activeP === "number" && row.p === activeP;
          const isOpen = expandAll || (typeof openP === "number" && row.p === openP);
          return (
            <div
              key={row.p}
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                background: isActive ? "rgba(66,140,255,0.14)" : "rgba(0,0,0,0.16)",
                borderRadius: 14, overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  try { onJumpToP?.(row.p); } catch {}
                  if (expandAll) return;
                  setOpenP((cur) => (cur === row.p ? null : row.p));
                }}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 12px",
                  background: "transparent", border: "none", color: "#e6edf6",
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: 10,
                }}
                aria-expanded={isOpen}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 900, opacity: 0.9 }}>{row.title}</span>
                  {isActive ? (
                    <span style={{ fontSize: 11, fontWeight: 900, padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", opacity: 0.95 }}>Active</span>
                  ) : null}
                </div>
                <span style={{ fontWeight: 900, opacity: 0.7 }}>{isOpen ? "▾" : "▸"}</span>
              </button>

              {isOpen ? (
                <div style={{ padding: "0 12px 12px 12px" }}>
                  <ul style={{ margin: "6px 0 0 18px", padding: 0, opacity: 0.9, lineHeight: 1.55 }}>
                    {row.bullets.map((b, i) => (
                      <li key={i} style={{ margin: "2px 0" }}>{b}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}




