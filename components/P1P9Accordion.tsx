import React, { useEffect, useMemo, useState } from "react";

type Status = "ON_TRACK" | "NEEDS_ATTENTION" | "UNKNOWN";

export type P1P9Item = {
  id: string;
  title: string;
  subtitle?: string;
  status?: Status | string;
  coachNotes?: string;
  commonMisses?: string[];
  keyDrills?: string[];
};

type Props = {
  onSelectPose?: (poseId: string) => void;
items?: P1P9Item[];
  defaultMode?: "single" | "multi";
  showExpandAll?: boolean;
  autoOpenPriority?: boolean;
  priorityId?: string;
};

export default function P1P9Accordion({ 
  onSelectPose,
  items = [],
  defaultMode = "single",
  showExpandAll = true,
  autoOpenPriority = true,
  priorityId = "P5",
}: Props) {
  const safeItems = Array.isArray(items) ? items : [];

  const [openId, setOpenId] = useState<string | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [openSet, setOpenSet] = useState<Set<string>>(new Set());
  const [autoOpened, setAutoOpened] = useState(false);

  const norm = (s: any) => String(s ?? "").toLowerCase();

  const getStatus = (x: P1P9Item): Status => {
    const s = norm(x.status);
    if (s.includes("needs")) return "NEEDS_ATTENTION";
    if (s.includes("on_track") || s.includes("on track")) return "ON_TRACK";
    return "UNKNOWN";
  };

  const isOpen = (id: string) => {
    if (allOpen) return true;
    if (defaultMode === "single") return openId === id;
    return openSet.has(id);
  };

  const toggleOne = (id: string) => {
    if (allOpen) return;

    if (defaultMode === "single") {
      setOpenId((cur) => (cur === id ? null : id));
      return;
    }

    setOpenSet((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const next = !allOpen;
    setAllOpen(next);

    if (!next) {
      setOpenSet(new Set());
      setOpenId(null);
      setAutoOpened(false);
    }
  };

  useEffect(() => {
    if (!autoOpenPriority) return;
    if (allOpen) return;
    if (autoOpened) return;
    if (!safeItems.length) return;
    if (defaultMode !== "single") return;

    const firstNeeds =
      safeItems.find((x) => norm(x.status).includes("needs")) ||
      safeItems.find((x) => norm(x.status).includes("attention"));

    const p = safeItems.find((x) => norm(x.id) === norm(priorityId));
    const target = firstNeeds?.id || p?.id || safeItems[0]?.id;

    if (target) {
      setOpenId(target);
      setAutoOpened(true);
    }
  }, [safeItems, allOpen, autoOpened, autoOpenPriority, defaultMode, priorityId]);

  const styles = useMemo(() => {
    const card: React.CSSProperties = {
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(0,0,0,0.16)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      padding: 22,
      color: "#e6edf6",
    };

    const row: React.CSSProperties = {
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(0,0,0,0.18)",
      marginBottom: 12,
      overflow: "hidden",
    };

    const header: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 16px",
      cursor: allOpen ? "default" : "pointer",
      userSelect: "none",
    };

    const left: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12 };

    const badge: React.CSSProperties = {
      width: 34,
      height: 34,
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.12)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 900,
      background: "rgba(0,0,0,0.30)",
    };

    const btn: React.CSSProperties = {
      height: 30,
      padding: "0 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(0,0,0,0.20)",
      color: "#e6edf6",
      fontWeight: 900,
      fontSize: 12,
      whiteSpace: "nowrap",
    };

    const pill = (status: Status): React.CSSProperties => {
      const isNeeds = status === "NEEDS_ATTENTION";
      const isOn = status === "ON_TRACK";
      return {
        ...btn,
        borderColor: isNeeds ? "rgba(234,179,8,0.45)" : isOn ? "rgba(34,197,94,0.45)" : "rgba(255,255,255,0.12)",
        background: isNeeds ? "rgba(234,179,8,0.10)" : isOn ? "rgba(34,197,94,0.10)" : "rgba(0,0,0,0.20)",
        color: isNeeds ? "#ffe9a6" : isOn ? "#bff7d1" : "#e6edf6",
      };
    };

    const body: React.CSSProperties = {
      padding: 16,
      borderTop: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(0,0,0,0.14)",
    };

    const cols: React.CSSProperties = {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 12,
    };

    const box: React.CSSProperties = {
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(0,0,0,0.16)",
      padding: 14,
      minHeight: 92,
    };

    const highlight: React.CSSProperties = {
      outline: "2px solid rgba(234,179,8,0.22)",
      boxShadow: "0 0 0 2px rgba(234,179,8,0.10) inset",
    };

    return { card, row, header, left, badge, btn, pill, body, cols, box, highlight };
  }, [allOpen]);

  return (
    <div style={styles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 0.3 }}>P1-P9 Accordion (Test)</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            Click a checkpoint to open it. Use Expand all when you want the full scroll.
          </div>
        </div>

        {showExpandAll && (
          <button onClick={toggleAll} style={styles.btn}>
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      {safeItems.map((p) => {
        const status = getStatus(p);
        const open = isOpen(p.id);
        const needs = status === "NEEDS_ATTENTION";
        const isPriority = norm(p.id) === norm(priorityId);

        return (
          <div key={p.id} style={{ ...styles.row, ...(needs && isPriority ? styles.highlight : {}) }}>
            <div style={styles.header} onClick={() => toggleOne(p.id)}>
              <div style={styles.left}>
                <div style={styles.badge}>{p.id}</div>
                <div>
                  <div style={{ fontWeight: 900 }}>{p.title}</div>
                  {p.subtitle && <div style={{ fontSize: 12, opacity: 0.7 }}>{p.subtitle}</div>}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={styles.pill(status)}>
                  {status === "NEEDS_ATTENTION" ? "NEEDS_ATTENTION" : status === "ON_TRACK" ? "ON_TRACK" : "OK"}
                </span>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.25)",
                    fontWeight: 900,
                  }}
                >
                  {open ? "−" : "+"}
                </div>
              </div>
            </div>

            {open && (
              <div style={styles.body}>
                <div style={styles.cols}>
                  <div style={styles.box}>
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>Coach Notes</div>
                    <div style={{ fontSize: 13, opacity: 0.92 }}>{p.coachNotes || "—"}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      <button style={styles.btn}>AI notes</button>
                      <button style={styles.btn}>Need more info</button>
                      <button style={styles.btn}>YouTube</button>
                    </div>
                  </div>

                  <div style={styles.box}>
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>Common Misses</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, opacity: 0.92 }}>
                      {(p.commonMisses?.length ? p.commonMisses : ["—"]).map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={styles.box}>
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>Key Drills</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, opacity: 0.92 }}>
                      {(p.keyDrills?.length ? p.keyDrills : ["—"]).map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                    <div style={{ fontSize: 11, opacity: 0.65, marginTop: 8 }}>
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





