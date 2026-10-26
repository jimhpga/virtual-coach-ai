import TopNav from "../_components/TopNav";
import UploadClient from "./UploadClient";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <main style={{ minHeight: "100vh", padding: "0 18px 64px" }}>
      <TopNav active="upload" logoSrc="/brand/vca-logo.png" />

      <section style={{ maxWidth: 920, margin: "42px auto 0" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ color: "#65c7ff", fontSize: 12, fontWeight: 950, letterSpacing: 1.7, textTransform: "uppercase" }}>
            Virtual Coach AI · Instant Lesson
          </div>
          <h1 style={{ margin: "10px 0 8px", fontSize: "clamp(34px,5vw,54px)", lineHeight: 1.02, letterSpacing: -1.7, color: "#f2f6fb" }}>
            Upload one swing.
            <br />Get a coaching plan.
          </h1>
          <p style={{ maxWidth: 650, margin: "0 auto", color: "rgba(232,240,248,0.70)", fontSize: 16, lineHeight: 1.6 }}>
            We analyze the full motion, identify P1-P10, rank the biggest opportunities, and build your report automatically.
          </p>
        </div>

        <div style={{ borderRadius: 26, border: "1px solid rgba(255,255,255,0.12)", background: "linear-gradient(180deg,rgba(10,18,28,0.84),rgba(5,10,17,0.78))", boxShadow: "0 32px 90px rgba(0,0,0,0.42)", padding: "clamp(18px,4vw,30px)", backdropFilter: "blur(18px)" }}>
          <UploadClient />
        </div>

        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }} className="vcaUploadTrust">
          {[
            ["1", "Upload", "Choose a face-on or down-the-line swing."],
            ["2", "Analyze", "VCA finds the checkpoints and motion pattern."],
            ["3", "Improve", "Get priorities, power moves, and a practice plan."],
          ].map(([n, title, body]) => (
            <div key={n} style={{ padding: 15, borderRadius: 17, border: "1px solid rgba(255,255,255,0.09)", background: "rgba(0,0,0,0.22)" }}>
              <div style={{ color: "#65c7ff", fontSize: 12, fontWeight: 950 }}>{n}</div>
              <div style={{ marginTop: 3, color: "#f1f5fa", fontWeight: 900 }}>{title}</div>
              <div style={{ marginTop: 4, color: "rgba(232,240,248,0.62)", fontSize: 12, lineHeight: 1.45 }}>{body}</div>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        @media (max-width: 700px) {
          .vcaUploadTrust { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}