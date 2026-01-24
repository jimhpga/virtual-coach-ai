import React from "react";

export function TinyCard(props: { title?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.18)",
        overflow: "hidden",
      }}
    >
      {props.title ? (
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            fontWeight: 900,
            letterSpacing: 0.2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{props.title}</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>AUTO</span>
        </div>
      ) : null}
      <div style={{ padding: 14 }}>{props.children}</div>
    </div>
  );
}

export function ConfidenceMeter(props: {
  label: string;
  phase: string;
  trend: "dip" | "exit" | "climb";
  score: number; // 0-100
  note?: string;
}) {
  const s = Math.max(0, Math.min(100, props.score || 0));
  const phaseTag =
    props.trend === "dip" ? "Dip" : props.trend === "exit" ? "Gap Exit" : "Climb";

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 900 }}>{props.label}</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {phaseTag} • {props.phase}
        </div>
      </div>

      <div
        style={{
          height: 12,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${s}%`,
            background: "rgba(66,140,255,0.85)",
            borderRight: "1px solid rgba(0,0,0,0.25)",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.82 }}>
        <span>0</span>
        <span style={{ fontWeight: 900 }}>{s}</span>
        <span>100</span>
      </div>

      {props.note ? (
        <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.82 }}>{props.note}</div>
      ) : null}
    </div>
  );
}
