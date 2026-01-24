"use client";

import { useEffect, useMemo, useState } from "react";

import { PDescriptionsCollapsed } from "../components/PDescriptionsCollapsed";
type PFrame = { p:number; label:string; frame:number; imageUrl:string; thumbUrl?:string };
type PFramesJson = { ok:boolean; framesDir?:string; frames:PFrame[] };

export default function PStrip(props: { onPick?: (pf: PFrame) => void }) {
  const [frames, setFrames] = useState<PFrame[]>([]);
  const [selectedP, setSelectedP] = useState<number>(7);

  
  const [expandAll, setExpandAll] = useState(false);
  const [openP, setOpenP] = useState<number | null>(7);useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch("/data/pframes-p1-p9.json", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as PFramesJson;
      if (!json?.ok) return;

      const sorted = [...(json.frames || [])].sort((a,b)=>a.p-b.p);
      if (!alive) return;

      setFrames(sorted);
            const p0 = sorted.some(f=>f.p===7) ? 7 : (sorted[0]?.p ?? 1);
      setSelectedP(p0);
      setOpenP(p0);})().catch(()=>{});
    return () => { alive = false; };
  }, []);

  const selected = useMemo(() => frames.find(f=>f.p===selectedP) || null, [frames, selectedP]);

    function pick(p:number) {
    setSelectedP(p);
    if (!expandAll) setOpenP(p);
    const pf = frames.find(f=>f.p===p);
    if (pf && props.onPick) props.onPick(pf);
  }

  if (!frames.length) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom: 8 }}>
        <div style={{ fontWeight: 800, opacity: 0.9 }}>Positions:</div>
        
        <div style={{ display:"flex", gap:8, marginLeft: 6 }}>
          <button
            type="button"
            onClick={() => { setExpandAll(true); setOpenP(null); }}
            style={{
              height: 30,
              padding: "0 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.25)",
              color: "white",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 12,
              opacity: expandAll ? 0.65 : 1
            }}
            title="Show all P positions expanded"
          >
            Expand all
          </button>

          <button
            type="button"
            onClick={() => { setExpandAll(false); setOpenP(selectedP); }}
            style={{
              height: 30,
              padding: "0 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.25)",
              color: "white",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 12,
              opacity: !expandAll ? 0.75 : 1
            }}
            title="Return to single-open mode"
          >
            Collapse all
          </button>
        </div>{frames.map(f => (
          <button
            key={f.p}
            onClick={() => pick(f.p)}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.16)",
              background: f.p === selectedP ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.25)",
              color: "white",
              cursor: "pointer",
              fontWeight: 800
            }}
            title={`Go to ${f.label} (frame ${f.frame})`}
          >
            {f.label}
          </button>
        ))}
      </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(9, minmax(0, 1fr))", gap: 8 }}>
        {frames.map(f => {
          const isOpen = expandAll || (typeof openP === "number" && f.p === openP);
          return (
            <button
              key={`pf-${f.p}`}
              type="button"
              onClick={() => {
                pick(f.p);
                if (expandAll) return;
                setOpenP((cur) => (cur === f.p ? null : f.p));
              }}
              style={{
                padding: 0,
                textAlign: "left",
                border: (f.p === selectedP)
                  ? "2px solid rgba(255,255,255,0.55)"
                  : "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                overflow: "hidden",
                background: "rgba(0,0,0,0.25)",
                cursor: "pointer"
              }}
              title={`${f.label} (frame ${f.frame})`}
            >
              <img
                src={isOpen ? (f.imageUrl || f.thumbUrl) : (f.thumbUrl || f.imageUrl)}
                alt={f.label}
                style={{
                  width:"100%",
                  height: isOpen ? 150 : 78,
                  objectFit:"cover",
                  display:"block"
                }}
              />
              <div style={{
                padding:"6px 8px",
                fontSize:12,
                opacity:0.92,
                display:"flex",
                justifyContent:"space-between",
                alignItems:"center"
              }}>
                <span style={{ fontWeight: 900 }}>{f.label}</span>
                <span style={{ opacity: 0.75 }}>F{f.frame}</span>
              </div>
              {!expandAll && isOpen && (
                <div style={{ padding:"0 8px 10px", fontSize: 12, opacity: 0.82, lineHeight: 1.45 }}>
                  Tap again to collapse. Use the buttons above to Expand all / Collapse all.
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
          Selected: <b>{selected.label}</b> (frame {selected.frame})
        </div>
      )}
    </div>
  );
}


