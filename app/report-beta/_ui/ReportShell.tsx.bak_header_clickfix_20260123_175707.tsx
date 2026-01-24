"use client";

import React from "react";

type ReportShellProps = {
  titleTop?: string;
  titleMain?: string;
  rightPills?: string[];
  children: React.ReactNode;
};

export default function ReportShell(props: ReportShellProps) {
  const { titleTop, titleMain, rightPills = [], children } = props;

  const __pillAction = (label: string) => {
    const t = String(label || "").toLowerCase();
    try {
      if (t.includes("back") && t.includes("home")) {
        window.location.href = "/";
        return;
      }
      if (t.includes("upload")) {
        window.location.href = "/upload";
        return;
      }
      if (t.includes("print")) {
        window.print();
        return;
      }
    } catch {}
  };

  const pill = (p: string) => {
    const t = String(p || "").toLowerCase();
    const commonStyle: React.CSSProperties = {
      height: 28,
      padding: "0 12px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.22)",
      color: "#e6edf6",
      fontWeight: 900,
      fontSize: 12,
      cursor: "pointer",
      userSelect: "none",
      display: "inline-flex",
      alignItems: "center",
      textDecoration: "none",
      pointerEvents: "auto",
    };

    if (t.includes("back") && t.includes("home")) {
      return (
        <a href="/" style={commonStyle}>
          Back to home
        </a>
      );
    }
    if (t.includes("upload")) {
      return (
        <a href="/upload" style={commonStyle}>
          Upload another swing
        </a>
      );
    }
    if (t.includes("print")) {
      return (
        <button type="button" onClick={() => __pillAction(p)} style={commonStyle}>
          Print report
        </button>
      );
    }

    return (
      <button type="button" onClick={() => __pillAction(p)} style={commonStyle}>
        {p}
      </button>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 20,
        background:
          'linear-gradient(180deg, rgba(2,12,28,0.88) 0%, rgba(2,10,22,0.76) 55%, rgba(1,6,14,0.92) 100%), radial-gradient(1200px 700px at 18% 0%, rgba(45,140,255,0.26), rgba(0,0,0,0)), linear-gradient(90deg, rgba(0,70,160,0.20) 0%, rgba(0,0,0,0) 55%), url(/bg/home-bg.png)',
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        color: "#eaf1ff",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 18px 14px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            {titleTop ? <div style={{ fontSize: 14, opacity: 0.85 }}>{titleTop}</div> : null}
            {titleMain ? (
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 0.2 }}>{titleMain}</div>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", position: "relative", zIndex: 9999, pointerEvents: "auto" }}>
            {rightPills.map((p) => (
              <React.Fragment key={p}>{pill(p)}</React.Fragment>
            ))}
          </div>
        </div>

        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}
