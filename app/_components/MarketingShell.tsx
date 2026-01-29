"use client";

import Link from "next/link";

type Props = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  active?: "home" | "upload" | "coming" | "report";
};

const pill: React.CSSProperties = {
  height: 34,
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.28)",
  color: "#e6edf6",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  fontWeight: 700,
  textDecoration: "none",
  backdropFilter: "blur(8px)",
};

const pillActive: React.CSSProperties = {
  ...pill,
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.22)",
};

export default function MarketingShell({ title, subtitle, children, active }: Props) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: "url(/bg/course-dusk.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* overlay for readability */}
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(1200px 600px at 20% 0%, rgba(0,70,120,0.35), rgba(0,0,0,0.78) 60%), linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.82))",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 18px 60px" }}>
          {/* top nav */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.26)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src="/brand/vca-logo.png"
                alt="Virtual Coach AI"
                style={{ height: 36, width: "auto", filter: "none", opacity: 1 }}
              />
              <div style={{ lineHeight: 1.05 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#eaf2ff" }}>Virtual Coach AI</div>
                <div style={{ fontSize: 12, opacity: 0.72, color: "#cfe0ff" }}>Upload • Analyze • Improve</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Link href="/" style={active === "home" ? pillActive : pill}>Home</Link>
              <Link href="/upload" style={active === "upload" ? pillActive : pill}>Upload</Link>
              <Link href="/coming-soon" style={active === "coming" ? pillActive : pill}>Coming Soon</Link>
              <Link href="/report-beta/full" style={active === "report" ? pillActive : pill}>Demo Report</Link>
            </div>
          </div>

          {/* hero box */}
          {(title || subtitle) && (
            <div
              style={{
                marginTop: 18,
                padding: "22px 22px",
                borderRadius: 22,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.28)",
                backdropFilter: "blur(10px)",
              }}
            >
              {title && (
                <div style={{ fontSize: 46, fontWeight: 900, letterSpacing: -0.4, color: "#eef5ff" }}>
                  {title}
                </div>
              )}
              {subtitle && (
                <div style={{ marginTop: 10, maxWidth: 780, fontSize: 15, opacity: 0.78, color: "#dbe7ff" }}>
                  {subtitle}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 16 }}>{children}</div>

          <div style={{ marginTop: 22, opacity: 0.6, fontSize: 12, color: "#cfe0ff" }}>
            © Virtual Coach AI — internal demo build
          </div>
        </div>
      </div>
    </div>
  );
}
