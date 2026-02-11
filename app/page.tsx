export const dynamic = "force-static";

export default function HomePage() {
  return (
    <main className="vca-bg">
      <div className="vca-shell">
        <header className="vca-top">
          <div className="vca-brand">
            <div className="vca-logo" aria-label="Virtual Coach AI" />
            <div>
              <div className="vca-title">Virtual Coach AI</div>
              <div className="vca-subtitle">Upload • Analyze • Improve</div>
            </div>
          </div>

          <nav className="vca-nav">
            <a className="vca-pill" href="/upload">Upload Swing</a>
            <a className="vca-pill" href="/coming-soon">Coming Soon</a>
            <a className="vca-pill vca-pill-primary" href="/report-beta/full">View Demo Report</a>
          </nav>
        </header>

        <section className="vca-card vca-hero">
          <h1 className="vca-h1">Stop guessing. Start improving.</h1>
          <p className="vca-p">
  Upload a swing. Get a clear report. Fix the top 2–3 issues with a simple practice plan.
</p>

          <div className="vca-actions">
            <a className="vca-btn vca-btn-primary" href="/upload">Upload a swing</a>
            <a className="vca-btn" href="/report-beta/full">See demo report</a>
          </div>

          <p className="vca-footnote">Demo mode works locally even without full upload/pose wiring.</p>
        </section>

        <footer className="vca-footer">© Virtual Coach AI — internal demo build</footer>
      </div>
    </main>
  );
}