"use client";

import React, { useRef, useState } from "react";

type Stage = "idle" | "uploading" | "saving" | "opening" | "error";

function pctLabel(stage: Stage, pct: number) {
  if (stage === "uploading") return "Uploading swing · " + Math.max(1, Math.round(pct)) + "%";
  if (stage === "saving") return "Preparing your analysis…";
  if (stage === "opening") return "Opening your report…";
  if (stage === "error") return "Something needs attention";
  return "Ready";
}

export default function UploadClient() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [handedness, setHandedness] = useState("right");
  const busy = stage !== "idle" && stage !== "error";

  async function getJson(res: Response, fallback: string) {
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) throw new Error(json?.error || fallback);
    return json;
  }

  function uploadToMux(url: string, video: File) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url, true);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) setProgress((event.loaded / event.total) * 100);
      };
      xhr.onerror = () => reject(new Error("Upload connection failed. Please try again."));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error("Video upload failed (" + xhr.status + ")."));
      };
      xhr.send(video);
    });
  }

  async function start() {
    if (!file || busy) return;
    setError("");
    setProgress(1);
    setStage("uploading");
    try {
      const directRes = await fetch("/api/mux-direct-upload", { method: "POST" });
      const direct = await getJson(directRes, "Could not start video upload.");
      if (!direct.uploadId || !direct.uploadUrl) throw new Error("Upload service did not return a valid destination.");
      await uploadToMux(direct.uploadUrl, file);

      setStage("saving");
      setProgress(100);
      const savedRes = await fetch("/api/save-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "processing",
          muxUploadId: direct.uploadId,
          playerName: "Golfer",
          handedness,
          sourceFilename: file.name,
          sourceSizeBytes: file.size,
          schemaVersion: "1.0",
        }),
      });
      const saved = await getJson(savedRes, "Could not create your report.");
      if (!saved.url) throw new Error("Report service did not return a report URL.");
      try { sessionStorage.setItem("vca_card_src", saved.url); } catch {}
      setStage("opening");
      window.location.assign("/report-beta/full?src=" + encodeURIComponent(saved.url));
    } catch (e: any) {
      setStage("error");
      setError(e?.message || "Upload failed. Please try again.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => { if (!busy && (e.key === "Enter" || e.key === " ")) inputRef.current?.click(); }}
        role="button"
        tabIndex={0}
        style={{
          minHeight: 240, display: "grid", placeItems: "center", textAlign: "center", padding: 28,
          borderRadius: 24, border: "1px dashed rgba(255,255,255,0.24)",
          background: file ? "linear-gradient(180deg, rgba(85,190,255,0.12), rgba(255,255,255,0.04))" : "rgba(255,255,255,0.035)",
          cursor: busy ? "default" : "pointer", transition: "180ms ease",
        }}
      >
        <input
          ref={inputRef} type="file" accept="video/*,.mov,.mp4,.m4v" disabled={busy}
          onChange={(e) => {
            const next = e.target.files?.[0] ?? null;
            setFile(next); setError(""); setStage("idle"); setProgress(0);
          }}
          style={{ display: "none" }}
        />
        <div>
          <div style={{ fontSize: 42, lineHeight: 1 }}>↥</div>
          <div style={{ marginTop: 10, fontSize: 23, fontWeight: 950 }}>
            {file ? file.name : "Choose your swing video"}
          </div>
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.7, lineHeight: 1.5 }}>
            {file ? ((file.size / 1024 / 1024).toFixed(1) + " MB · tap to choose a different video") : "Face-on or down-the-line · full golfer and club visible"}
          </div>
        </div>
      </div>

      <div className="vcaUploadOptions" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(160px,220px)", gap: 12, alignItems: "end" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.1, opacity: 0.62, textTransform: "uppercase" }}>What happens next</div>
          <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5, opacity: 0.82 }}>
            We find P1-P10, analyze your motion, rank the biggest opportunities, and build your coaching report.
          </div>
        </div>
        <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 850 }}>
          Handedness
          <select
            value={handedness} onChange={(e) => setHandedness(e.target.value)} disabled={busy}
            style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.28)", color: "#eef4f8", fontWeight: 800 }}
          >
            <option value="right">Right-handed</option>
            <option value="left">Left-handed</option>
          </select>
        </label>
      </div>

      {busy && (
        <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(101,199,255,0.18)", background: "rgba(101,199,255,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, fontWeight: 900 }}>
            <span>{pctLabel(stage, progress)}</span>
            <span style={{ opacity: 0.65 }}>{stage === "uploading" ? Math.round(progress) + "%" : ""}</span>
          </div>
          <div style={{ height: 8, marginTop: 10, borderRadius: 999, background: "rgba(255,255,255,0.10)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: stage === "uploading" ? Math.max(3, progress) + "%" : "100%", borderRadius: 999, background: "linear-gradient(90deg,#65c7ff,#74e4ad)", transition: "width 180ms ease" }} />
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(255,120,120,0.22)", background: "rgba(255,90,90,0.08)", color: "#ffd2d2", fontSize: 14 }}>
          {error}
        </div>
      )}

      <button
        type="button" onClick={start} disabled={!file || busy}
        style={{ width: "100%", minHeight: 54, border: 0, borderRadius: 15, background: !file || busy ? "rgba(255,255,255,0.10)" : "#65c7ff", color: !file || busy ? "rgba(255,255,255,0.44)" : "#06111a", fontSize: 16, fontWeight: 950, cursor: !file || busy ? "default" : "pointer", boxShadow: !file || busy ? "none" : "0 14px 38px rgba(65,180,255,0.22)" }}
      >
        {busy ? pctLabel(stage, progress) : "Analyze My Swing"}
      </button>

      <style>{`@media (max-width: 680px) { .vcaUploadOptions { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}