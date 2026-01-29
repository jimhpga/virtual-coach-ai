export default function ReportPage() {
  return (
    <main style={{ minHeight: "100vh", padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <a href="/" style={{ textDecoration: "none", color: "inherit", fontWeight: 800 }}>Back</a>
          <nav style={{ display: "flex", gap: 14, fontSize: 14 }}>
            <a href="/upload">Upload</a>
            <a href="/coming-soon">Coming Soon</a>
          </nav>
        </header>

        <h1 style={{ marginTop: 26, fontSize: 34 }}>Report</h1>
        <p style={{ opacity: 0.75, maxWidth: 740 }}>
          Stable /report route. Later we redirect this to your real report view.
        </p>

        <div style={{ marginTop: 16, padding: 18, borderRadius: 16, border: "1px solid rgba(0,0,0,0.12)", background: "white" }}>
          <div style={{ fontWeight: 800 }}>MVP Report Placeholder</div>
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            Keep your existing report engine untouched.
          </div>
        </div>
      </div>
    </main>
  );
}
