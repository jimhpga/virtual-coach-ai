import Link from "next/link";
import React from "react";

export function Shell({ title, subtitle, right, children }) {
  return (
    <div style={{
      minHeight: "100vh",
      padding: "26px 18px 60px",
      color: "#e6edf6",
      background:
        "radial-gradient(1200px 700px at 20% 0%, rgba(66,140,255,0.22), transparent 55%)," +
        "radial-gradient(900px 600px at 80% 0%, rgba(44,220,170,0.16), transparent 55%)," +
        "linear-gradient(180deg, #08101a 0%, #050a10 70%, #05070b 100%)"
    }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900 }}>{title}</div>
            {subtitle && <div style={{ opacity: 0.8 }}>{subtitle}</div>}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {right}
            <Link href="/" style={{ color: "#b9cff6", fontWeight: 800 }}>← Home</Link>
          </div>
        </div>
        <div style={{
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.22)",
          padding: 22
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
