export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <main style={{ minHeight: "100vh", padding: 20 }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/brand/vca-logo.png" alt="Virtual Coach AI" style={{ width: 110, height: "auto" }} />
          </a>
          <div style={{ color: "#e6edf6" }}>
            <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -0.2 }}>Upload a swing</div>
            <div style={{ fontSize: 13, opacity: 0.75 }}>Upload → Processing → Full report.</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <a href="/coming-soon" style={{ color: "#cfd7e6", textDecoration: "none", fontWeight: 800, fontSize: 13, opacity: 0.9 }}>Coming soon</a>
            <a href="/report-beta/full" style={{ color: "#cfd7e6", textDecoration: "none", fontWeight: 800, fontSize: 13, opacity: 0.9 }}>Report</a>
          </div>
        </div>

        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.28)",
            padding: 18,
            boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#f2f6ff" }}>Upload. Get a report. Improve.</div>
            <div style={{ fontSize: 12, opacity: 0.75, color: "#c7cfdd" }}>
              Demo mode: attempts live analysis when available. If anything fails, golden fallback kicks in so you still get a clean report.
            </div>
          </div>

          <div id="vca-upload-root" />

          {/* Uses your existing proven client script */}
          <script src="/upload.client.v2.js" defer></script>
        </div>
      </div>
    </main>
  );
}
