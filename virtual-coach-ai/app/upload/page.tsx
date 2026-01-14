"use client";

import React, { useMemo, useState } from "react";

type UploadResp =
  | { ok: true; uploadId: string; final: { filename: string; sizeMB: number; url: string } }
  | { ok: false; error: string };

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  async function onUpload() {
    setErr(null);
    setResultUrl(null);
    setResultId(null);

    if (!file) {
      setErr("Pick a video first.");
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json()) as UploadResp;

      if (!json.ok) throw new Error((json as any).error || "Upload failed");

      setResultUrl(json.final.url);
      setResultId(json.uploadId);
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 10px 0" }}>Upload</h1>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        Upload one swing. We’ll store a reduced MP4 and use it for the report.
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={onUpload}
            disabled={!file || busy}
            style={{
              height: 42,
              padding: "0 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: busy ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.10)",
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 800,
            }}
          >
            {busy ? "Uploading..." : "Upload video"}
          </button>
        </div>

        {err && <div style={{ marginTop: 12, color: "#ffb4b4" }}>{err}</div>}

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6, fontWeight: 800 }}>
            Preview
          </div>
          {previewUrl ? (
            <video
              src={previewUrl}
              controls
              playsInline
              preload="metadata"
              style={{ width: "100%", borderRadius: 12, background: "#000" }}
            />
          ) : (
            <div style={{ opacity: 0.7 }}>No video selected yet.</div>
          )}
        </div>

        {resultUrl && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6, fontWeight: 800 }}>
              Stored
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <code style={{ padding: "6px 10px", borderRadius: 10, background: "rgba(0,0,0,0.25)" }}>
                {resultUrl}
              </code>
              <a href={resultUrl} target="_blank" rel="noreferrer">
                Open video
              </a>
              {resultId && (
                <a href={`/report?uploadId=${encodeURIComponent(resultId)}`}>
                  Go to report
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
