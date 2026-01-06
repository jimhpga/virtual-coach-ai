"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function BetaLoginPage() {
  const sp = useSearchParams();
  const nextPath = useMemo(() => sp.get("next") || "/beta", [sp]);
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/beta/login/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pw }),
      });

      if (res.ok) {
        window.location.href = nextPath;
        return;
      }
      setErr("Incorrect access code");
    } catch {
      setErr("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "radial-gradient(1200px 800px at 50% 20%, rgba(255,255,255,0.08), rgba(0,0,0,0.92))",
      color: "#e6edf6",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    }}>
      <div style={{
        width: "min(440px, 100%)",
        borderRadius: 18,
        padding: 22,
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.45)"
      }}>
        <div style={{ fontSize: 12, letterSpacing: 0.8, opacity: 0.8, fontWeight: 700 }}>
          PRIVATE BETA ACCESS
        </div>
        <h1 style={{ margin: "10px 0 8px 0", fontSize: 24, fontWeight: 800 }}>
          Virtual Coach AI
        </h1>
        <div style={{ opacity: 0.85, marginBottom: 14, lineHeight: 1.35 }}>
          Enter your access code to continue.
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 800, marginBottom: 6 }}>
            Access Code
          </div>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="••••••••"
            style={{
              width: "100%",
              height: 44,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(0,0,0,0.35)",
              color: "#e6edf6",
              padding: "0 12px",
              outline: "none",
            }}
          />
        </div>

        <button
          onClick={submit}
          disabled={loading || !pw.trim()}
          style={{
            width: "100%",
            marginTop: 14,
            height: 44,
            borderRadius: 12,
            border: "0",
            cursor: loading || !pw.trim() ? "not-allowed" : "pointer",
            background: "rgba(255,255,255,0.14)",
            color: "#e6edf6",
            fontWeight: 800,
          }}
        >
          {loading ? "Checking..." : "Enter"}
        </button>

        {err && (
          <div style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(255,0,0,0.35)",
            background: "rgba(255,0,0,0.08)",
            color: "#ffd1d1",
            fontWeight: 700,
          }}>
            {err}
          </div>
        )}

        <div style={{ marginTop: 14, fontSize: 12, opacity: 0.65 }}>
          Tip: This is a limited beta. If you don’t have a code, you’re early — and we like that.
        </div>
      </div>
    </div>
  );
}
