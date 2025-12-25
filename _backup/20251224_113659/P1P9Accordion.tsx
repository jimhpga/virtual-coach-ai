import { useMemo, useState, useEffect } from "react";

export type P1P9Item = {
  id: string; // "P1"..."P9"
  label: string;
  summary?: string;
  status?: "ON_TRACK" | "NEEDS_ATTENTION" | "PRIORITY_FIX";
  coachNotes?: string;
  commonMisses?: string[];
  keyDrills?: string[];
};

export default function P1P9Accordion({ items = [], defaultMode = "single", showExpandAll = true }: { items?: P1P9Item[]; defaultMode?: "single" | "ll"; showExpandAll?: boolean }) {
  const sorted = useMemo(() => {
    const rank = (id: string) => {
      const m = id.match(/P(\d+)/i);
      return m ? parseInt(m[1], 10) : 999;
    };
    return [...(items ?? [])].sort((a, b) => rank(a.id) - rank(b.id));
  }, [items]);

  const [openSet, setOpenSet] = useState<Record<string, boolean>>({ P1: true });

  const allOpen = sorted.every((x) => openSet[x.id]);

  const toggleAll = () => {
    if (allOpen) {
      setOpenSet({ P1: true });
    } else {
      const next: Record<string, boolean> = {};
      sorted.forEach((x) => (next[x.id] = true));
      setOpenSet(next);
    }
  };

  const toggleOne = (id: string) => {
    setOpenSet((prev) => {
      const isOpen = !!prev[id];
      if (defaultMode === "single") return isOpen ? {} : { [id]: true };
      return { ...prev, [id]: !isOpen };
    });
  };

  const pill = (status?: P1P9Item["status"]) => {
    const base: React.CSSProperties = {
      fontSize: 11,
      fontWeight: 900,
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(0,0,0,0.22)",
      opacity: 0.9,
      whiteSpace: "nowrap",
    };
    if (status === "NEEDS_ATTENTION") {
      return { ...base, background: "rgba(234,179,8,0.12)", borderColor: "rgba(234,179,8,0.35)", color: "#f5e7b0" };
    }
    if (status === "PRIORITY_FIX") {
      return { ...base, background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.35)", color: "#ffd2d2" };
    }
    return { ...base, background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.35)", color: "#bff5d1" };
  };

  const row: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
    borderRadius: 16,
    overflow: "hidden",
  };

  const header: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 14px",
    cursor: "pointer",
  };

  const bodyGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1.3fr 1fr 1fr",
    gap: 12,
    padding: "14px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  };

  const box: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
    borderRadius: 14,
    padding: 12,
    minHeight: 86,
  };

  const miniBtn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 28,
    padding: "0 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.20)",
    color: "#e6edf6",
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  };
  useEffect(() => {
    // Auto-open the first priority checkpoint when the section becomes visible.
    // Priority = first item marked NEEDS_ATTENTION / needs_attention / "needs".
    // This does NOT fight Expand All, and runs once (autoOpened).
    if (allOpen) return;
    if (autoOpened) return;
    if (!Array.isArray(items) || items.length === 0) return;

    const norm = (s: any) => String(s ?? "").toLowerCase();
    const firstPriority =
      items.find((x: any) => norm(x.status).includes("needs")) ||
      items.find((x: any) => norm(x.status).includes("attention")) ||
      items[0];

    if (firstPriority?.id) {
      // Use your existing toggleOne implementation (works regardless of internal open state shape)
      try { toggleOne(firstPriority.id); } catch {}
      setAutoOpened(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, allOpen, autoOpened]);



  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Click a checkpoint to open it. Use Expand all when you want the full scroll.
        </div>
        {showExpandAll && (
          <button onClick={toggleAll} style={{ ...miniBtn, height: 32 }}>
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {sorted.map((p) => {
          const isOpen = !!openSet[p.id];
  useEffect(() => {
    // Auto-open the first priority checkpoint when the section becomes visible.
    // Priority = first item marked NEEDS_ATTENTION / needs_attention / "needs".
    // This does NOT fight Expand All, and runs once (autoOpened).
    if (allOpen) return;
    if (autoOpened) return;
    if (!Array.isArray(items) || items.length === 0) return;

    const norm = (s: any) => String(s ?? "").toLowerCase();
    const firstPriority =
      items.find((x: any) => norm(x.status).includes("needs")) ||
      items.find((x: any) => norm(x.status).includes("attention")) ||
      items[0];

    if (firstPriority?.id) {
      // Use your existing toggleOne implementation (works regardless of internal open state shape)
      try { toggleOne(firstPriority.id); } catch {}
      setAutoOpened(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, allOpen, autoOpened]);


          return (
            <div key={p.id} style={row}>
              <div style={header} onClick={() => { if (allOpen) return; toggleOne(p.id); }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 1000,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(0,0,0,0.22)",
                    }}
                  >
                    {p.id}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900 }}>{p.label}</div>
                    {p.summary ? <div style={{ fontSize: 12, opacity: 0.7 }}>{p.summary}</div> : null}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={pill(p.status)}>{p.status ?? "ON_TRACK"}</span>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(0,0,0,0.20)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      opacity: 0.9,
                    }}
                  >
                    {isOpen ? "−" : "+"}
                  </div>
                </div>
              </div>

              {isOpen && (
                <div style={bodyGrid}>
                  <div style={box}>
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>Coach Notes</div>
                    <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.5 }}>
                      {p.coachNotes ?? "—"}
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button style={miniBtn}>AI notes</button>
                      <button style={miniBtn}>Need more info</button>
                      <button style={miniBtn}>YouTube</button>
                    </div>
                  </div>

                  <div style={box}>
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>Common Misses</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.85, lineHeight: 1.6 }}>
                      {(p.commonMisses?.length ? p.commonMisses : ["—"]).map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={box}>
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>Key Drills</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.85, lineHeight: 1.6 }}>
                      {(p.keyDrills?.length ? p.keyDrills : ["—"]).map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                    <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>
                      (AI will later pick 1–2 drills that match your top faults.)
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}








