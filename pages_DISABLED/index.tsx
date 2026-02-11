import React from "react";
import BrandShell from "../components/BrandShell";
import Head from "next/head";
import Link from "next/link";

export default function HomePage() {
  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background:
      "linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.55)), url('/golf_bg.jpg') center/cover no-repeat",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  };

  const card: React.CSSProperties = {
    width: "min(920px, 92vw)",
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
    padding: "28px 24px",
    textAlign: "center",
    boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
  };

  const btn: React.CSSProperties = {
    height: 44,
    padding: "0 18px",
    borderRadius: 12,
    border: "1px solid rgba(34,197,94,0.45)",
    background: "rgba(34,197,94,0.18)",
    color: "#fff",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
  };

  const ghost: React.CSSProperties = {
    ...btn,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    fontWeight: 800,
  };

  return (
    <>
      <Head>
        <title>Virtual Coach AI</title>
      </Head>

      <BrandShell title="Virtual Coach AI">
<main style={shell}>
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <img
              src="/logo.png"
              alt="Virtual Coach AI"
              style={{ height: 70, width: "auto", filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.6))" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          <div style={{ fontSize: 12, opacity: 0.9, letterSpacing: 2 }}>BETA</div>
          <h1 style={{ fontSize: 44, margin: "10px 0 10px", fontWeight: 1000 }}>Virtual Coach AI</h1>
          <p style={{ margin: "0 auto 18px", maxWidth: 720, opacity: 0.9, lineHeight: 1.6 }}>
            Upload a swing. Get an instant report with your top 2-3 priorities, drills, and a simple score.
            No clutter. No "swing thoughts soup."
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/upload" style={btn}>
              Upload your swing
            </Link>
            <Link href="/reports" style={ghost}>
              See sample report
            </Link>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, opacity: 0.75 }}>
            Coming soon: Tour DNA Match, Impact Clip, and auto P1-P10 sync.
          </div>
        </div>
      </main>
</BrandShell>
    </>
  );
}
