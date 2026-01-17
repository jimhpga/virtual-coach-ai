"use client";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/upload";

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b1220", color: "white", padding: 24 }}>
      <div style={{ width: "min(520px, 92vw)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Virtual Coach AI</div>
        <div style={{ opacity: 0.8, marginBottom: 14 }}>Demo login (sets a cookie). Then sends you back where you were going.</div>
        <button
          onClick={() => (window.location.href = `/api/login?next=${encodeURIComponent(next)}`)}
          style={{ width: "100%", padding: "12px 14px", fontWeight: 900, borderRadius: 12, border: "0", background: "#6ea8ff", cursor: "pointer" }}
        >
          Enter
        </button>
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          Next: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{next}</span>
        </div>
      </div>
    </div>
  );
}
