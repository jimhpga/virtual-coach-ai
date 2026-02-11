"use client";

import React, { useEffect, useMemo, useState } from "react";

type AnyObj = Record<string, any>;

function normAngle(deg: number): number {
  let a = deg;
  while (a > 180) a -= 360;
  while (a <= -180) a += 360;
  return a;
}
function pickNumber(...vals: any[]): number | null {
  for (const v of vals) if (typeof v === "number" && isFinite(v)) return v;
  return null;
}
function fmt(deg: number | null, digits = 2): string {
  if (deg === null) return "n/a";
  return deg.toFixed(digits);
}
function labelDelta(delta: number | null): string {
  if (delta === null) return "No Data";
  const d = delta;
  if (d <= -25) return "Flat++";
  if (d <= -10) return "Flat+";
  if (d < -4) return "Slightly Flat";
  if (d <= 4) return "On-Plane";
  if (d < 10) return "Slightly Steep";
  if (d < 25) return "Steep+";
  return "Steep++";
}
function badge(): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(0,0,0,0.03)",
    marginRight: 8,
    fontSize: 12,
    marginBottom: 6,
  };
}
function card(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(0,0,0,0.02)",
    padding: 14,
    marginTop: 12,
  };
}
function getPhase(phases: any[], name: string): any | null {
  const p = phases?.find((x) => x?.phase === name);
  return p ?? null;
}
function getShaftDeg(o: AnyObj): number | null {
  return pickNumber(
    o?.shaft?.angleDeg,
    o?.shaft?.proxy?.angleDeg,
    o?.shaftPlane?.angleDeg,
    o?.shaftPlaneDeg,
    o?.Proxy,
    o?.Final,
    o?.shaftDeg
  );
}
function getHandDeg(o: AnyObj): number | null {
  return pickNumber(
    o?.handPlane?.angleDeg,
    o?.handPlaneDeg,
    o?.Hand
  );
}
function getDeltaDeg(o: AnyObj): number | null {
  return pickNumber(o?.delta?.deg, o?.deltaDeg);
}

export default function ReadyBundleCoachTools() {
  const [open, setOpen] = useState(false);
  const [showAlignment, setShowAlignment] = useState(true);
  const [showP6, setShowP6] = useState(true);
  const [showX, setShowX] = useState(true);

  const [bundle, setBundle] = useState<AnyObj | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setErr(null);
        const res = await fetch("/data/ready_report_bundle_demo.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Coach Tools fetch failed: " + res.status);
        const j = await res.json();
        setBundle(j);

        // Honor server toggles if present
        const t = j?.toggles;
        if (t) {
          if (typeof t.showAlignment === "boolean") setShowAlignment(t.showAlignment);
          if (typeof t.showP6Card === "boolean") setShowP6(t.showP6Card);
          // xfactor toggle key is showXFactor in bundle
          if (typeof t.showXFactor === "boolean") setShowX(t.showXFactor);
        }
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    })();
  }, [open]);

  const computed = useMemo(() => {
    if (!bundle) return null;
    const shaftPhases: AnyObj[] = bundle?.shaft?.phases ?? [];

    const p3 = getPhase(shaftPhases, "P3");
    const p5 = getPhase(shaftPhases, "P5");
    const p6 = getPhase(shaftPhases, "P6");
    const p7 = getPhase(shaftPhases, "P7");
    const p1 = getPhase(shaftPhases, "P1"); // may not exist yet

    const p3S = p3 ? getShaftDeg(p3) : null;
    const p5S = p5 ? getShaftDeg(p5) : null;
    const SSI = (p3S !== null && p5S !== null) ? normAngle(p3S - p5S) : null;

    const p1S = p1 ? getShaftDeg(p1) : null;
    const p7S = p7 ? getShaftDeg(p7) : null;
    const PRI = (p1S !== null && p7S !== null) ? Math.abs(normAngle(p7S - p1S)) : null;

    const p6Delta = p6 ? (getDeltaDeg(p6) ?? (() => {
      const s = getShaftDeg(p6);
      const h = getHandDeg(p6);
      if (s === null || h === null) return null;
      return normAngle(s - h);
    })()) : null;

    return { SSI, PRI, p6Delta };
  }, [bundle]);

  const align = bundle?.alignment;
  const xf = bundle?.xfactor;
  const alignAngles = align?.anglesDeg ?? align?.angles ?? align?.angles_deg ?? {};

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          borderRadius: 12,
          padding: "10px 12px",
          border: "1px solid rgba(0,0,0,0.12)",
          background: open ? "rgba(0,0,0,0.04)" : "white",
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        Coach Tools {open ? "▾" : "▸"}
      </button>

      {open && (
        <div style={card()}>
          {err && (
            <div style={{ color: "crimson", marginBottom: 10 }}>
              <b>Coach Tools error:</b> {err}
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Expected: <code>/public/data/ready_report_bundle_demo.json</code>
              </div>
            </div>
          )}

          {!bundle && !err && <div style={{ opacity: 0.75 }}>Loading Coach Tools…</div>}

          {bundle && (
            <>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <span style={badge()}>SSI (P3→P5): <b>{fmt(computed?.SSI)}</b>°</span>
                <span style={badge()}>PRI (P1→P7): <b>{fmt(computed?.PRI)}</b>°</span>
                <span style={badge()}>P6 Δ: <b>{fmt(computed?.p6Delta)}</b>° ({labelDelta(computed?.p6Delta ?? null)})</span>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13 }}>
                <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={showAlignment} onChange={(e) => setShowAlignment(e.target.checked)} />
                  Alignment
                </label>
                <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={showP6} onChange={(e) => setShowP6(e.target.checked)} />
                  P6 Moment of Truth
                </label>
                <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={showX} onChange={(e) => setShowX(e.target.checked)} />
                  X-Factor
                </label>
              </div>

              {showAlignment && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Alignment (P1)</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={badge()}>Feet: <b>{fmt(pickNumber(alignAngles?.feetAim))}</b>°</span>
                    <span style={badge()}>Hips: <b>{fmt(pickNumber(alignAngles?.hipsAim))}</b>°</span>
                    <span style={badge()}>Shoulders: <b>{fmt(pickNumber(alignAngles?.shouldersAim))}</b>°</span>
                    <span style={badge()}>Avg: <b>{fmt(pickNumber(alignAngles?.bodyAimAvg))}</b>°</span>
                    <span style={badge()}>Conf: <b>{fmt(typeof align?.confidence === "number" ? (align.confidence*100) : null, 0)}</b>%</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                    Target line assumption uses setup intent + shaft reference when the ball/target isn’t visible.
                  </div>
                </div>
              )}

              {showP6 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>P6 — Moment of Truth</div>
                  <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                    If the club is functional at P6, P7 is basically booked. Face condition at P6 dictates the body “deal” at impact.
                  </div>
                </div>
              )}

              {showX && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>X-Factor (Proxy)</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={badge()}>Top: <b>{String(xf?.xFactor?.topPhase ?? "P4")}</b> {fmt(pickNumber(xf?.xFactor?.topDeg))}°</span>
                    <span style={badge()}>Impact: <b>{String(xf?.xFactor?.impactPhase ?? "P7")}</b> {fmt(pickNumber(xf?.xFactor?.impactDeg))}°</span>
                    <span style={badge()}>Stretch: <b>{fmt(pickNumber(xf?.xFactor?.stretchDeg))}</b>°</span>
                    <span style={badge()}>Conf: <b>{fmt(typeof xf?.confidence === "number" ? (xf.confidence*100) : null, 0)}</b>%</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                    Proxy metric: shouldersAcrossDeg − hipsAcrossDeg. Great for trends; not a lab torque readout.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}