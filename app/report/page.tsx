import { Shell } from "../_components/Shell";

export default function ReportPage() {
  return (
    <Shell
      title={"Your swing report"}
      subtitle={"Result first. Depth if you want it."}
      maxWidth={980}
    >
      <div
        style={{
          padding: 18,
          borderRadius: 14,
          border: "1px solid #2a2f36",
          background: "rgba(11, 15, 20, 0.65)",
          backdropFilter: "blur(10px)",
        }}
      >
        <p style={{ margin: 0, opacity: 0.85, lineHeight: 1.5 }}>
          Demo shortcut: open the sample report (golden) while analysis wiring finishes.
        </p>

        <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            href="/report-beta?golden=1"
            style={{
              padding: "12px 18px",
              borderRadius: 12,
              background: "#ffffff",
              color: "#000",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Open sample report
          </a>
          <a
            href="/upload"
            style={{
              padding: "12px 18px",
              borderRadius: 12,
              border: "1px solid #2a2f36",
              color: "#eaeaea",
              textDecoration: "none",
            }}
          >
            Upload another swing
          </a>
        </div>
      </div>
    </Shell>
  );
}
