"use client";

import { useState } from "react";

export default function RunAnalysisButton({
  videoUrl,
  pathname,
}: {
  videoUrl: string;
  pathname?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setErr(null);
    setOut(null);
    setBusy(true);
    try {
      const res = await fetch("/api/analyze-swing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoUrl, pathname }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Analyze failed (${res.status})`);
      setOut(json);
    } catch (e: any) {
      setErr(e?.message || "Analyze failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginLeft: "auto", minWidth: 220 }}>
      <button
        onClick={run}
        disabled={busy || !videoUrl}
        style={{
          height: 42,
          padding: "0 16px",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.18)",
          background: busy ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.06)",
          cursor: busy ? "not-allowed" : "pointer",
          fontWeight: 800,
          width: "100%",
        }}
      >
        {busy ? "Running..." : "Run Analysis"}
      </button>

      {err && <div style={{ marginTop: 10, color: "#b00020" }}>{err}</div>}

      {out && (
        <pre
          style={{
            marginTop: 10,
            whiteSpace: "pre-wrap",
            background: "rgba(0,0,0,0.04)",
            padding: 12,
            borderRadius: 12,
            fontSize: 12,
            maxHeight: 240,
            overflow: "auto",
          }}
        >
{JSON.stringify(out, null, 2)}
        </pre>
      )}
    </div>
  );
}
