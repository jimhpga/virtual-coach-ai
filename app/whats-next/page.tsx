export default function WhatsNextPage() {
  const shell: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: "28px 18px 48px" };

  const glass: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.35)",
    boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
    padding: 22,
    color: "#e6edf6",
    backdropFilter: "blur(10px)",
  };

  const h1: React.CSSProperties = { fontSize: 34, margin: "0 0 10px 0", fontWeight: 900 };
  const p: React.CSSProperties = { margin: "8px 0", opacity: 0.85, lineHeight: 1.55 };

  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 14 };

  const card: React.CSSProperties = {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.28)",
    padding: 14,
  };

  const title: React.CSSProperties = { fontWeight: 900, fontSize: 16, marginBottom: 6 };
  const small: React.CSSProperties = { fontSize: 13, opacity: 0.78, lineHeight: 1.45 };

  return (
    <main style={shell}>
      <section style={glass}>
        <h1 style={h1}>What’s Next</h1>
        <p style={p}>
          Phase 0 proves the experience: clean UI, instant report, no clutter. Next phases add power without adding confusion.
        </p>

        <div style={grid}>
          <div style={card}>
            <div style={title}>Phase 1 — Report polish + reliability</div>
            <div style={small}>
              Final report layout, Phase strip at the bottom, consistent background everywhere, zero double-nav, one-click download.
            </div>
          </div>

          <div style={card}>
            <div style={title}>Phase 2 — Tour DNA Match</div>
            <div style={small}>
              Mechanical similarity match + explanation box: “Similarity ≠ strength/speed.” Practice plans close the gaps.
            </div>
          </div>

          <div style={card}>
            <div style={title}>Phase 3 — Impact clip (north star)</div>
            <div style={small}>
              Short, impact-centered slow-mo clip. Never cuts downswing. This is the “iPhone moment” of the product.
            </div>
          </div>

          <div style={card}>
            <div style={title}>Phase 4 — Auto Phase sync + scoring</div>
            <div style={small}>
              Auto-detect Phase 1–9 from video, consistency scoring, top 2–3 priorities, 1–2 drills per fault.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.10)", opacity: 0.86 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Links</div>
          <div style={{ display:"flex", gap:14, flexWrap:"wrap", fontWeight: 900 }}>
            <a href="/reports" style={{ color:"#bfe7c8", textDecoration:"none" }}>Reports hub →</a>
            <a href="/report-beta" style={{ color:"#bfe7c8", textDecoration:"none" }}>Sample report →</a>
            <a href="/upload" style={{ color:"#bfe7c8", textDecoration:"none" }}>Upload →</a>
          </div>
        </div>
      </section>
    </main>
  );
}
