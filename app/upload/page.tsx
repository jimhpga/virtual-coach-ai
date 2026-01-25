"use client";

import React, { useMemo, useState } from "react";

type ApiResp = {
  ok: boolean;
  jobId?: string;
  report?: any;
  scores?: any;
  debug?: any;
  message?: string;
};

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const fileLabel = useMemo(() => {
    if (!file) return "No file selected";
    const mb = (file.size / (1024 * 1024)).toFixed(2);
    return `${file.name} — ${mb} MB`;
  }, [file]);
  function saveAndGoToReport(j: ApiResp) {
  // Always clear UI FIRST (prevents ghost state if Next dev keeps component alive briefly)
  try { setBusy(false); } catch {}
  try { setStatus("Opening report…"); } catch {}
  try { setErr(""); } catch {}

  // Persist
  try {
    const payload = {
      at: new Date().toISOString(),
      jobId: j?.jobId || "",
      report: j?.report || null,
      scores: j?.scores || null,
      debug: j?.debug || null,
    };
    localStorage.setItem("vca_last_report", JSON.stringify(payload));
  } catch {}

  // Hard navigation (avoids SPA weirdness)
  try {
    window.location.replace("/report");
  } catch {
    try { window.location.href = "/report"; } catch {}
  }
};
  async function callDemo() {
    setErr("");
    setStatus("Building demo report…");
    setBusy(true);
    try {
      const r = await fetch("/api/analyze-swing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo: true }),
      });
      const j: ApiResp = await r.json();
      if (!j?.ok) throw new Error(j?.message || "Demo failed");
      saveAndGoToReport(j);
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : "Demo failed");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function analyze() {
    setErr("");
    if (!file) {
      setErr("Pick a video first.");
      return;
    }

    setStatus("Uploading…");
    setBusy(true);

    try {
      // Minimal: call demo for now (swap to real upload pipeline next)
      setStatus("Analyzing…");
      const r = await fetch("/api/analyze-swing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo: true }),
      });
      const j: ApiResp = await r.json();
      if (!j?.ok) throw new Error(j?.message || "Analyze failed");
      saveAndGoToReport(j);
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : "Analyze failed");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          width: "min(920px, 92vw)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.28)",
          boxShadow: "0 30px 120px rgba(0,0,0,0.45)",
          padding: 22,
          color: "#e8eef7",
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: 1.2, opacity: 0.75, marginBottom: 8 }}>VIRTUAL COACH AI</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Upload a swing (Live MVP)</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 16 }}>
          Upload → Analyze → Report. If you see “Analyzing…”, you’re winning.
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={busy}
            style={{
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.22)",
              color: "#e8eef7",
            }}
          />

          <div style={{ fontSize: 12, opacity: 0.8 }}>Selected: <b>{fileLabel}</b></div>

          <button
            type="button"
            onClick={analyze}
            disabled={busy || !file}
            style={{
              height: 46,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: busy ? "rgba(120,120,120,0.18)" : "rgba(70,120,180,0.35)",
              color: "#e8eef7",
              fontWeight: 800,
              cursor: busy || !file ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Analyzing…" : "Analyze swing →"}
          </button>

          <button
            type="button"
            onClick={callDemo}
            disabled={busy}
            style={{
              height: 46,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "#e8eef7",
              fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            Try Golden Demo →
          </button>

          {status ? <div style={{ fontSize: 12, opacity: 0.85 }}>{status}</div> : null}
          {err ? <div style={{ fontSize: 12, color: "#ffb4b4" }}>{err}</div> : null}
        </div>
      </div>
    </div>
  );
}





