import { Shell } from "./_components/Shell";

export default function Landing() {
  return (
    <Shell
      title={"Upload one swing.\nGet one clear priority."}
      subtitle={
        "Virtual Coach AI turns a swing video into a focused plan — score, priority, and one drill."
      }
      maxWidth={880}
    >
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <a
          href="/upload"
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            background: "#ffffff",
            color: "#000",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Upload a swing
        </a>

        <a
          href="/report-beta?golden=1"
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            border: "1px solid #2a2f36",
            color: "#eaeaea",
            textDecoration: "none",
          }}
        >
          View sample report
        </a>

        <a
          href="/coming-soon"
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            border: "1px solid #2a2f36",
            color: "#eaeaea",
            textDecoration: "none",
            opacity: 0.9,
          }}
        >
          Coming soon
        </a>
      </div>

      <p style={{ marginTop: 22, fontSize: 14, opacity: 0.6 }}>
        Built for fast feedback. No fluff.
      </p>
    </Shell>
  );
}
