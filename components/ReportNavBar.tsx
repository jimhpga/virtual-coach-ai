import Link from "next/link";

type Props = {
  // prefer this name
  onJumpVideo?: () => void;
  // allow older/alternate name
  onJumpToVideo?: () => void;
};

export default function ReportNavBar(props: Props) {
  const jump = props.onJumpVideo ?? props.onJumpToVideo;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        background: "rgba(0,0,0,0.35)",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "10px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/upload" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontWeight: 600 }}>
            ← Back
          </Link>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.15)" }} />
          <Link href="/p1p9" style={{ color: "rgba(255,255,255,0.70)", textDecoration: "none" }}>
            P1-P10
          </Link>
          <Link href="/view" style={{ color: "rgba(255,255,255,0.70)", textDecoration: "none" }}>
            Viewer
          </Link>
        </div>

        <button
          onClick={() => { try { jump?.(); } catch {} }}
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.90)",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Jump to video
        </button>
      </div>
    </div>
  );
}

