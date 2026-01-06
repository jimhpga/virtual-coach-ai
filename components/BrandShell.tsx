import React from "react";
import SiteNav from "./SiteNav";

export default function BrandShell({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background:
      "radial-gradient(1100px 700px at 30% 10%, rgba(34,197,94,0.10), transparent 60%), radial-gradient(900px 600px at 90% 10%, rgba(59,130,246,0.10), transparent 55%), #050b16",
    color: "#e6edf6",
    padding: "22px 16px 60px",
  };

  const max: React.CSSProperties = { maxWidth: 1200, margin: "0 auto" };

  const titleRow: React.CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    gap: 10,
    margin: "14px 0 14px",
    flexWrap: "wrap",
  };

  return (
    <div style={shell}>
      <div style={max}>
        {/* ONE NAV. Lives here. */}
        <SiteNav />

        {/* Optional page title (keeps your existing pattern) */}
        {title ? (
          <div style={titleRow}>
            <div style={{ fontWeight: 900, letterSpacing: 0.5 }}>VIRTUAL COACH AI</div>
            <div style={{ opacity: 0.75 }}>— {title}</div>
          </div>
        ) : (
          <div style={{ height: 10 }} />
        )}

        {children}
      </div>
    </div>
  );
}
