"use client";

import React from "react";

export default function UploadLivePage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function onSubmit() {
    setErr(null);
    if (!file) return setErr("Pick a swing video first.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || "Upload failed");

      const id = j.id as string;
      const src = `/api/job/${id}`;
      try { sessionStorage.setItem("vca_card_src", src); } catch {}
      window.location.href = `/report-beta/full?src=${encodeURIComponent(src)}`;
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "radial-gradient(1200px 600px at 20% 0%, rgba(70,140,255,0.22), transparent 55%), #05070b",
      color: "#eaf1ff",
      padding: 24
    }}>
      <div style={{
        width: "min(860px, 100%)",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.45)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
        padding: 18
      }}>
        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>VIRTUAL COACH AI</div>
        <div style={{ fontSize: 22, fontWeight: 1000, marginTop: 6 }}>Upload a swing (Live MVP)</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, lineHeight: 1.45 }}>
          Real pipeline: upload → job JSON → report renderer.
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.35)",
              color: "#eaf1ff"
            }}
          />

          <button
            onClick={onSubmit}
            disabled={!file || busy}
            style={{
              height: 44,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: busy ? "rgba(120,120,120,0.25)" : "rgba(120,180,255,0.22)",
              color: "#eaf1ff",
              fontWeight: 1000,
              cursor: (!file || busy) ? "not-allowed" : "pointer"
            }}
          >
            {busy ? "Analyzing…" : "Analyze swing →"}
          </button>

          {err ? <div style={{ fontSize: 13, color: "#ffd2d2" }}>{err}</div> : null}
        </div>
      </div>
    </div>
  );
}