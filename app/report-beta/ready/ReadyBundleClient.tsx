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
  for (const v of vals) {
    if (typeof v === "number" && isFinite(v)) return v;
  }
  return null;
}

function fmt(deg: number | null, digits = 2): string {
  if (deg === null) return "n/a";
  return deg.toFixed(digits);
}

function labelDelta(delta: number | null): string {
  if (delta === null) return "No Data";
  const d = delta;
  // delta = shaft - hand (normalized); negative = flatter relative to hands
  if (d <= -25) return "Flat++";
  if (d <= -10) return "Flat+";
  if (d < -4) return "Slightly Flat";
  if (d <= 4) return "On-Plane";
  if (d < 10) return "Slightly Steep";
  if (d < 25) return "Steep+";
  return "Steep++";
}

function badgeStyle() {
  return {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    marginRight: 8,
    fontSize: 12,
  } as React.CSSProperties;
}

function cardStyle() {
  return {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    padding: 14,
    marginTop: 12,
  } as React.CSSProperties;
}

function h2Style() {
  return { margin: "0 0 8px 0", fontSize: 16 } as React.CSSProperties;
}

function getPhase(phases: any[], name: string): any | null {
  const p = phases?.find((x) => x?.phase === name);
  return p ?? null;
}

function getShaftDeg(phaseObj: AnyObj): number | null {
  // handle multiple shapes
  return pickNumber(
    phaseObj?.shaft?.angleDeg,
    phaseObj?.shaft?.proxy?.angleDeg,
    phaseObj?.shaftPlane?.angleDeg,
    phaseObj?.shaftPlaneDeg,
    phaseObj?.Proxy,
    phaseObj?.Final,
    phaseObj?.shaftDeg
  );
}

function getHandDeg(phaseObj: AnyObj): number | null {
  return pickNumber(
    phaseObj?.handPlane?.angleDeg,
    phaseObj?.handPlaneDeg,
    phaseObj?.Hand
  );
}

function getDeltaDeg(phaseObj: AnyObj): number | null {
  return pickNumber(
    phaseObj?.delta?.deg,
    phaseObj?.deltaDeg
  );
}

function getConfRaw(phaseObj: AnyObj): number | null {
  return pickNumber(
    phaseObj?.shaft?.confidenceRaw,
    phaseObj?.Conf,
    phaseObj?.shaftConfRaw
  );
}

export default function ReadyBundleClient() {
  const [bundle, setBundle] = useState<AnyObj | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [showAlignment, setShowAlignment] = useState(true);
  const [showShaft, setShowShaft] = useState(true);
  const [showXFactor, setShowXFactor] = useState(true);
  const [showP6, setShowP6] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/ready_report_bundle_demo.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Fetch failed: " + res.status);
        const j = await res.json();
        setBundle(j);
        // honor server toggles if present
        const t = j?.toggles;
        if (t) {
          if (typeof t.showAlignment === "boolean") setShowAlignment(t.showAlignment);
          if (typeof t.showShaft === "boolean") setShowShaft(t.showShaft);
          if (typeof t.showXFactor === "boolean") setShowXFactor(t.showXFactor);
          if (typeof t.showP6Card === "boolean") setShowP6(t.showP6Card);
        }
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    })();
  }, []);

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

    const p6Delta = p6 ? (getDeltaDeg(p6) ?? (p6 ? (() => {
      const s = getShaftDeg(p6);
      const h = getHandDeg(p6);
      if (s === null || h === null) return null;
      return normAngle(s - h);
    })() : null)) : null;

    return { SSI, PRI, p6Delta };
  }, [bundle]);

  if (err) {
    return (
      <div style={{ color: "salmon" }}>
        <div style={{ fontWeight: 700 }}>UI load error</div>
        <pre style={{ whiteSpace: "pre-wrap" }}>{err}</pre>
      </div>
    );
  }

  if (!bundle) {
    return <div style={{ opacity: 0.8 }}>Loading Ready Bundle…</div>;
  }

  const align = bundle?.alignment;
  const shaft = bundle?.shaft;
  const xf = bundle?.xfactor;

  const alignAngles = align?.anglesDeg ?? align?.angles ?? align?.angles_deg ?? {};
  const shaftPhases: AnyObj[] = shaft?.phases ?? [];

  const rows = ["P2","P3","P5","P6","P7"].map((ph) => {
    const o = getPhase(shaftPhases, ph) ?? {};
    const s = getShaftDeg(o);
    const h = getHandDeg(o);
    const d = getDeltaDeg(o) ?? (s !== null && h !== null ? normAngle(s - h) : null);
    const conf = getConfRaw(o);
    const src = o?.shaft?.source ?? o?.shaftSrc ?? o?.Src ?? "unknown";
    return { ph, frame: o?.frame ?? o?.Frame ?? null, hand: h, shaft: s, delta: d, deltaLabel: labelDelta(d), conf, src };
  });

  const SSI = computed?.SSI ?? null;
  const PRI = computed?.PRI ?? null;
  const p6Delta = computed?.p6Delta ?? null;

  return (
    <div style={{
      maxWidth: 980,
      margin: "0 auto",
      color: "rgba(255,255,255,0.92)",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>VCA Ready Report (DTL)</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            bundle: <code>/data/ready_report_bundle_demo.json</code>
          </div>
        </div>
        <div>
          <span style={badgeStyle()}>SSI (P3→P5): <b>{fmt(SSI)}</b>°</span>
          <span style={badgeStyle()}>PRI (P1→P7): <b>{fmt(PRI)}</b>°</span>
          <span style={badgeStyle()}>P6 Δ: <b>{fmt(p6Delta)}</b>° ({labelDelta(p6Delta)})</span>
        </div>
      </div>

      <div style={cardStyle()}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={showAlignment} onChange={(e) => setShowAlignment(e.target.checked)} />
            Alignment
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={showShaft} onChange={(e) => setShowShaft(e.target.checked)} />
            Shaft
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={showXFactor} onChange={(e) => setShowXFactor(e.target.checked)} />
            X-Factor
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={showP6} onChange={(e) => setShowP6(e.target.checked)} />
            P6 Moment of Truth
          </label>
        </div>
        <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
          Confidence is always shown; when we’re guessing, we *say* we’re guessing.
        </div>
      </div>

      {showAlignment && (
        <div style={cardStyle()}>
          <div style={h2Style()}>Alignment (P1) — “Where you’re actually aiming”</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 13 }}>
            <span style={badgeStyle()}>Feet: <b>{fmt(pickNumber(alignAngles?.feetAim))}</b>°</span>
            <span style={badgeStyle()}>Hips: <b>{fmt(pickNumber(alignAngles?.hipsAim))}</b>°</span>
            <span style={badgeStyle()}>Shoulders: <b>{fmt(pickNumber(alignAngles?.shouldersAim))}</b>°</span>
            <span style={badgeStyle()}>Avg: <b>{fmt(pickNumber(alignAngles?.bodyAimAvg))}</b>°</span>
            <span style={badgeStyle()}>Conf: <b>{fmt(typeof align?.confidence === "number" ? (align.confidence*100) : null, 0)}</b>%</span>
            <span style={badgeStyle()}>Src: <b>{String(align?.source ?? "unknown")}</b></span>
          </div>
        </div>
      )}

      {showShaft && (
        <div style={cardStyle()}>
          <div style={h2Style()}>Shaft Keypoints (DTL) — P2 / P3 / P5 / P6 / P7</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", opacity: 0.8 }}>
                  <th style={{ padding: "8px 6px" }}>Phase</th>
                  <th style={{ padding: "8px 6px" }}>Frame</th>
                  <th style={{ padding: "8px 6px" }}>Hand°</th>
                  <th style={{ padding: "8px 6px" }}>Shaft°</th>
                  <th style={{ padding: "8px 6px" }}>Δ°</th>
                  <th style={{ padding: "8px 6px" }}>Label</th>
                  <th style={{ padding: "8px 6px" }}>ConfRaw</th>
                  <th style={{ padding: "8px 6px" }}>Src</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.ph} style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
                    <td style={{ padding: "8px 6px", fontWeight: 700 }}>{r.ph}</td>
                    <td style={{ padding: "8px 6px" }}>{r.frame ?? "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{fmt(r.hand)}</td>
                    <td style={{ padding: "8px 6px" }}>{fmt(r.shaft)}</td>
                    <td style={{ padding: "8px 6px" }}>{fmt(r.delta)}</td>
                    <td style={{ padding: "8px 6px" }}>{r.deltaLabel}</td>
                    <td style={{ padding: "8px 6px" }}>{r.conf ?? "—"}</td>
                    <td style={{ padding: "8px 6px", opacity: 0.85 }}>{r.src}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Interpretation (coach-safe): shaft plane is assessed relative to target line; if ball/target not visible, we default target line to setup shaft + alignment intent.
          </div>
        </div>
      )}

      {showP6 && (
        <div style={cardStyle()}>
          <div style={h2Style()}>P6 — Moment of Truth</div>
          <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.9 }}>
            <div style={{ marginBottom: 8 }}>
              If the shaft is functional at P6, P7 is mostly predetermined — unless you do something heroic (or weird) late.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span style={badgeStyle()}>P6 Δ: <b>{fmt(p6Delta)}</b>°</span>
              <span style={badgeStyle()}>Label: <b>{labelDelta(p6Delta)}</b></span>
              <span style={badgeStyle()}>Rule: <b>Face @ P6 dictates body needs at impact</b></span>
            </div>
          </div>
        </div>
      )}

      {showXFactor && (
        <div style={cardStyle()}>
          <div style={h2Style()}>X-Factor (2D Proxy)</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 13 }}>
            <span style={badgeStyle()}>Conf: <b>{fmt(typeof xf?.confidence === "number" ? (xf.confidence*100) : null, 0)}</b>%</span>
            <span style={badgeStyle()}>Top: <b>{String(xf?.xFactor?.topPhase ?? "P4")}</b> {fmt(pickNumber(xf?.xFactor?.topDeg))}°</span>
            <span style={badgeStyle()}>Impact: <b>{String(xf?.xFactor?.impactPhase ?? "P7")}</b> {fmt(pickNumber(xf?.xFactor?.impactDeg))}°</span>
            <span style={badgeStyle()}>Stretch: <b>{fmt(pickNumber(xf?.xFactor?.stretchDeg))}</b>°</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            This is a proxy — useful for trends, not a lab torque readout.
          </div>
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.65 }}>
        Tip: keep this page as your “scientific panel” while the main report stays clean and consumer-friendly.
      </div>
    </div>
  );
}