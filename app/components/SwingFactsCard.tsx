"use client";

import * as React from "react";

export type SwingFacts = {
  confidence?: string | number;
  tempo?: string | number;
  pFrames?: Record<string, number> | { p: number; frame: number }[];
  frames?: Record<string, number>;
  p1?: number; p2?: number; p3?: number; p4?: number; p5?: number; p6?: number; p7?: number; p8?: number; p9?: number;
  [k: string]: any;
};

function normalizePFrames(f: any): Record<string, number> {
  const out: Record<string, number> = {};
  if (!f) return out;

  // array: [{p:1,frame:12}, ...]
  if (Array.isArray(f)) {
    for (const it of f) {
      const p = it?.p ?? it?.P ?? it?.pos;
      const fr = it?.frame ?? it?.f ?? it?.idx;
      if (p != null && fr != null) out[`P${p}`] = Number(fr);
    }
    return out;
  }

  // object: { P1: 12, P2: 34 } or { p1: 12, p2: 34 }
  if (typeof f === "object") {
    for (const [k, v] of Object.entries(f)) {
      if (v == null) continue;
      const key = k.toUpperCase().startsWith("P") ? k.toUpperCase() : `P${k.replace(/^p/i, "")}`;
      if (/^P[1-9]$/.test(key)) out[key] = Number(v);
    }
  }
  return out;
}

export function SwingFactsCard({ url = "/pose-demo/swing_facts.json" }: { url?: string }) {
  const [facts, setFacts] = React.useState<SwingFacts | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as SwingFacts;
        if (!alive) return;
        setFacts(json);
        setErr(null);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load swing facts");
        setFacts(null);
      }
    })();
    return () => { alive = false; };
  }, [url]);

  const conf = facts?.confidence ?? "-";
  const tempo = facts?.tempo ?? facts?.tempoBpm ?? facts?.tempoRatio ?? "-";

  const pObj =
    normalizePFrames(facts?.pFrames) ||
    normalizePFrames(facts?.frames);

  // also accept flat p1..p9 numbers
  for (let i = 1; i <= 10; i++) {
    const k = `p${i}` as const;
    const v = (facts as any)?.[k];
    if (v != null) pObj[`P${i}`] = Number(v);
  }

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.25)",
        padding: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 0.4, opacity: 0.9 }}>Swing Facts</div>
        <div style={{ fontSize: 11, opacity: 0.7 }}>{url}</div>
      </div>

      {err ? (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>⚠️ {err}</div>
      ) : (
        <>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.06)", padding: 10 }}>
              <div style={{ fontSize: 11, opacity: 0.75 }}>Confidence</div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{String(conf)}</div>
            </div>
            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.06)", padding: 10 }}>
              <div style={{ fontSize: 11, opacity: 0.75 }}>Tempo</div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{String(tempo)}</div>
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Array.from({ length: 10 }, (_, idx) => {
              const p = `P${idx + 1}`;
              const v = pObj[p];
              return (
                <div
                  key={p}
                  style={{
                    padding: "6px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.05)",
                    fontSize: 12,
                    display: "flex",
                    gap: 6,
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ fontWeight: 800 }}>{p}</span>
                  <span style={{ opacity: 0.85 }}>{v != null && !Number.isNaN(v) ? v : "-"}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
