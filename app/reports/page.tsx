export default function ReportsPage() {
  const shell: React.CSSProperties = {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "28px 18px 42px",
  };

  const glass: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.35)",
    boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
    padding: 22,
    color: "#e6edf6",
    backdropFilter: "blur(10px)",
  };

  const h1: React.CSSProperties = { fontSize: 34, margin: "0 0 10px 0", fontWeight: 900, letterSpacing: 0.2 };
  const p: React.CSSProperties = { margin: "8px 0", opacity: 0.85, lineHeight: 1.55 };

  const cardRow: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 14 };

  const card: React.CSSProperties = {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.28)",
    padding: 14,
  };

  const a: React.CSSProperties = { color: "#bfe7c8", fontWeight: 900, textDecoration: "none" };
  const small: React.CSSProperties = { fontSize: 13, opacity: 0.75, marginTop: 6, lineHeight: 1.45 };

  const badge: React.CSSProperties = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.08)",
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.9,
    marginLeft: 8,
  };

  return (
    <main style={shell}>
      <section style={glass}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:12, flexWrap:"wrap", alignItems:"baseline" }}>
          <h1 style={h1}>Reports <span style={badge}>Phase 0 — Beta</span></h1>
          <div style={{ opacity: 0.7, fontSize: 13, fontWeight: 800 }}>Investor-friendly demo hub</div>
        </div>

        <p style={p}>
          This is the clean “show it to someone” page. One place to open a sample report, see what’s live, and see what’s next.
        </p>

        <div style={cardRow}>
          <div style={card}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Sample Swing Report</div>
            <div style={small}>
              Opens the report layout we’re polishing. Includes the Phase strip at the bottom.
            </div>
            <div style={{ marginTop: 10 }}>
              <a href="/report-beta" style={a}>Open sample report →</a>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Live Upload → Report (Pilot)</div>
            <div style={small}>
              Upload flow + report generation wiring. (If anything isn’t ready yet, it should say so clearly.)
            </div>
            <div style={{ marginTop: 10 }}>
              <a href="/upload" style={a}>Go to Upload →</a>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>What’s Next</div>
            <div style={small}>
              The “trajectory” page — so beta feels intentional, not incomplete.
            </div>
            <div style={{ marginTop: 10 }}>
              <a href="/whats-next" style={a}>View roadmap →</a>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Coming soon (high-level)</div>
          <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.82, lineHeight: 1.6 }}>
            <li>Tour DNA Match (similarity-based, not strength/speed)</li>
            <li>Impact clip (short, impact-centered, never cuts downswing)</li>
            <li>Auto Phase sync (Phase 1–9 detected from video)</li>
            <li>Download + Email delivery (one click)</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
