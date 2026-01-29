"use client";

import React from "react";

export default function HeroShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 700px at 18% 12%, rgba(120,170,255,0.25), transparent 55%)," +
          "radial-gradient(900px 650px at 78% 18%, rgba(0,255,210,0.10), transparent 55%)," +
          "linear-gradient(180deg, rgba(4,8,16,1), rgba(6,10,18,1) 45%, rgba(4,8,16,1))",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 14px 54px" }}>
        <div
          style={{
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.06)",
            boxShadow: "0 22px 70px rgba(0,0,0,0.35)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 18 }}>{children}</div>
        </div>

        <div style={{ marginTop: 16, color: "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "center" }}>
          © {new Date().getFullYear()} Virtual Coach AI • Demo build
        </div>
      </div>
    </div>
  );
}
