import Link from "next/link";

export default function Home() {
  return (
    <div style={{
      minHeight: "100vh",
      padding: 30,
      color: "#e6edf6",
      background:
        "radial-gradient(1200px 700px at 20% 0%, rgba(66,140,255,0.22), transparent 55%)," +
        "radial-gradient(900px 600px at 80% 0%, rgba(44,220,170,0.16), transparent 55%)," +
        "linear-gradient(180deg, #08101a 0%, #050a10 70%, #05070b 100%)"
    }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ fontSize: 40, fontWeight: 900, margin: 0 }}>Virtual Coach AI</h1>
        <p style={{ opacity: 0.85, marginTop: 8 }}>
          Clean. Obvious. Frictionless. Upload once—get coaching that changes motor patterns.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 18 }}>
          <Link href="/sequencing-truth" style={{ fontWeight: 900, color: "#b9cff6" }}>Sequencing Truth</Link>
          <Link href="/upload" style={{ fontWeight: 900, color: "#b9cff6" }}>Upload</Link>
          <Link href="/report?golden=1" style={{ fontWeight: 900, color: "#b9cff6" }}>Demo Report</Link>
          <Link href="/investor-demo" style={{ fontWeight: 900, color: "#b9cff6" }}>Investor Demo</Link>
          <Link href="/coming-soon" style={{ fontWeight: 900, color: "#b9cff6" }}>Coming Soon</Link>
        </div>

        <div style={{ marginTop: 26, display: "grid", gap: 12 }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 18, padding: 16, background: "rgba(0,0,0,0.20)" }}>
            <div style={{ fontWeight: 900 }}>What we detect</div>
            <div style={{ opacity: 0.85, marginTop: 6 }}>
              Timing + sequencing problems (example: hips late by ~0.08s) that cause inconsistency.
            </div>
          </div>
          <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 18, padding: 16, background: "rgba(0,0,0,0.20)" }}>
            <div style={{ fontWeight: 900 }}>What we prescribe</div>
            <div style={{ opacity: 0.85, marginTop: 6 }}>
              One drill that fixes the root cause—then we track your “gap” until you exit it.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
