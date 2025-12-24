import { useMemo, useState } from "react";

type Checkpoint = {
  id: string;
  label: string;
  status: "on_track" | "needs_attention" | "priority_fix";
  coachNotes: string;
  commonMisses: string[];
  keyDrills: string[];
};

const CHECKPOINTS: Checkpoint[] = [
  { id: "P1", label: "Setup", status: "on_track", coachNotes: "Balanced, athletic posture with clean alignments.", commonMisses: ["Ball too far back", "Grip too weak/strong for pattern"], keyDrills: ["Mirror setup check", "Alignment stick for feet/hips/shoulders"] },
  { id: "P2", label: "Shaft parallel backswing", status: "on_track", coachNotes: "Clubhead tracks nicely with stable face control.", commonMisses: ["Club inside early", "Face rolls open early"], keyDrills: ["Low-and-slow triangle", "Stop-at-P2 checkpoints"] },
  { id: "P3", label: "Lead arm parallel backswing", status: "on_track", coachNotes: "Good width and depth with solid coil potential.", commonMisses: ["Arms collapse", "Over-rotation without depth"], keyDrills: ["Towel-under-arms", "Wall drill for depth"] },
  { id: "P4", label: "Top of swing", status: "on_track", coachNotes: "Playable top position with good structure.", commonMisses: ["Across-the-line", "Over-long backswing"], keyDrills: ["Three-count backswing", "Pause-at-top rehearsals"] },
  { id: "P5", label: "Lead arm parallel downswing", status: "needs_attention", coachNotes: "Club gets a touch steep under pressure—easy fix.", commonMisses: ["Upper body dives", "Handle too high"], keyDrills: ["Pump drill", "Shallow-to-slot rehearsals"] },
  { id: "P6", label: "Shaft parallel downswing", status: "needs_attention", coachNotes: "Face/path playable but can get slightly steep.", commonMisses: ["Handle dragging high", "Trail shoulder down too soon"], keyDrills: ["Headcover outside the ball", "Split-hands delivery drill"] },
  { id: "P7", label: "Impact", status: "on_track", coachNotes: "Generally square with decent shaft lean and compression.", commonMisses: ["Low-point drift", "Hanging back"], keyDrills: ["Divot-forward line", "Impact bag (light)"] },
  { id: "P8", label: "Trail arm parallel follow-through", status: "on_track", coachNotes: "Arms/body sync well with clean extension.", commonMisses: ["Flip/roll early", "Arms outrun body"], keyDrills: ["Hold-P8 for 2s", "Throw-the-club feel (no release early)"] },
  { id: "P9", label: "Finish", status: "on_track", coachNotes: "Balanced full finish with chest to target.", commonMisses: ["Falling to toes/heels", "Stopping rotation early"], keyDrills: ["Finish hold 3 seconds", "Step-through finish"] },
];

function badgeStyle(status: Checkpoint["status"]): React.CSSProperties {
  if (status === "on_track") {
    return { background: "rgba(34,197,94,0.14)", borderColor: "rgba(34,197,94,0.35)", color: "rgba(220,255,236,0.95)" };
  }
  if (status === "priority_fix") {
    return { background: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)", color: "rgba(255,235,235,0.95)" };
  }
  return { background: "rgba(234,179,8,0.12)", borderColor: "rgba(234,179,8,0.35)", color: "rgba(255,248,224,0.95)" };
}

export default function P1P9Accordion() {
  // single-open mode uses openId; expand-all mode uses openAll=true
  const [openId, setOpenId] = useState<string | null>("P1");
  const [openAll, setOpenAll] = useState(false);

  const allIds = useMemo(() => CHECKPOINTS.map(c => c.id), []);

  const isOpen = (id: string) => openAll || openId === id;

  const toggleRow = (id: string) => {
    if (openAll) {
      // if user clicks a row while expanded-all, switch to single-open mode focused on that row
      setOpenAll(false);
      setOpenId(id);
      return;
    }
    setOpenId(prev => (prev === id ? null : id));
  };

  const headerRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "12px 14px",
    cursor: "pointer",
    userSelect: "none",
  };

  const card: React.CSSProperties = {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
    overflow: "hidden",
  };

  const pillBtn: React.CSSProperties = {
    height: 28,
    padding: "0 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "#e6edf6",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Click a checkpoint to open it. Use <strong>Expand all</strong> when you want the full scroll.
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!openAll ? (
            <button style={pillBtn} onClick={() => { setOpenAll(true); setOpenId(null); }}>
              Expand all
            </button>
          ) : (
            <button style={pillBtn} onClick={() => { setOpenAll(false); setOpenId("P1"); }}>
              Collapse all
            </button>
          )}
        </div>
      </div>

      {CHECKPOINTS.map((p) => {
        const opened = isOpen(p.id);

        return (
          <div key={p.id} style={card}>
            <div style={headerRow} onClick={() => toggleRow(p.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
                  {p.id}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                    {p.coachNotes}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 999,
                    padding: "6px 10px",
                    ...badgeStyle(p.status),
                  }}
                >
                  {p.status === "on_track" ? "ON TRACK" : p.status === "priority_fix" ? "PRIORITY FIX" : "NEEDS ATTENTION"}
                </span>
                <div style={{ width: 26, height: 26, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
                  {opened ? "–" : "+"}
                </div>
              </div>
            </div>

            {opened && (
              <div style={{ padding: "14px 16px", fontSize: 13, opacity: 0.92 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 12 }}>
                  <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 12, background: "rgba(0,0,0,0.12)" }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Coach Notes</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.9 }}>{p.coachNotes}</div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button style={{ ...pillBtn, height: 30 }} onClick={(e) => e.stopPropagation()}>
                        AI notes
                      </button>
                      <button style={{ ...pillBtn, height: 30 }} onClick={(e) => e.stopPropagation()}>
                        Need more info
                      </button>
                      <button style={{ ...pillBtn, height: 30 }} onClick={(e) => e.stopPropagation()}>
                        YouTube
                      </button>
                    </div>
                  </div>

                  <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 12, background: "rgba(0,0,0,0.12)" }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Common Misses</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.7, opacity: 0.9 }}>
                      {p.commonMisses.map((m) => <li key={m}>{m}</li>)}
                    </ul>
                  </div>

                  <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 12, background: "rgba(0,0,0,0.12)" }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Key Drills</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.7, opacity: 0.9 }}>
                      {p.keyDrills.map((d) => <li key={d}>{d}</li>)}
                    </ul>
                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                      (AI will later pick 1–2 drills that match your top faults.)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
