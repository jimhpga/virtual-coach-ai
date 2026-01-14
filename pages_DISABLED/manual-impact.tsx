import React, { useEffect, useMemo, useRef, useState } from "react";
import BrandShell from "../components/BrandShell";

type ManualImpactResp = {
  ok: boolean;
  videoPath: string;
  impactSec: number;
  impactSource: string;
  createdAt: string;
  outDir: string;
  error?: string;
};

export default function ManualImpactPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoPath, setVideoPath] = useState<string>("");
  const [impactSec, setImpactSec] = useState<number>(0);
  const [runId, setRunId] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [outDir, setOutDir] = useState<string>("");

  useEffect(() => {
    setRunId("MANUAL_" + Date.now());
  }, []);

  const canSave = useMemo(() => {
    return !!videoPath && impactSec >= 0 && Number.isFinite(impactSec);
  }, [videoPath, impactSec]);

  function syncFromVideo() {
    const v = videoRef.current;
    if (!v) return;
    setImpactSec(Number(v.currentTime.toFixed(3)));
    setMsg("Impact set to " + Number(v.currentTime.toFixed(3)) + " sec");
  }

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setMsg("");
    setOutDir("");

    try {
      const res = await fetch("/api/manual-impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoPath, impactSec, runId })
      });

      const data = (await res.json()) as ManualImpactResp;

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Manual impact failed");
      }

      setOutDir(data.outDir);
      setMsg("Saved. Frames generated at: " + data.outDir);
    } catch (e: any) {
      setMsg("ERROR: " + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "30px auto", padding: "0 16px", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h1 style={{ marginBottom: 8 }}>Manual Impact Picker (Backup Plan)</h1>
      <div style={{ color: "#555", marginBottom: 16 }}>
        Paste the <b>absolute Windows path</b> to the uploaded video, scrub to impact, click <b>Use current time</b>, then <b>Save</b>.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, padding: 14, border: "1px solid #ddd", borderRadius: 14 }}>
        <label style={{ fontSize: 12, color: "#333" }}>
          Video path (server can read)
          <input
            value={videoPath}
            onChange={(e) => setVideoPath(e.target.value)}
            placeholder="C:\Sites\virtual-coach-ai\public\uploads\yourvideo.mp4"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #ccc", marginTop: 6 }}
          />
        </label>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={syncFromVideo} style={btn(false)}>Use current video time as impact</button>

          <label style={{ fontSize: 12, color: "#333" }}>
            impactSec
            <input
              value={impactSec}
              onChange={(e) => setImpactSec(Number(e.target.value))}
              type="number"
              step="0.001"
              style={{ width: 160, padding: "10px 12px", borderRadius: 12, border: "1px solid #ccc", marginLeft: 8 }}
            />
          </label>

          <button onClick={save} disabled={!canSave || saving} style={btn(!canSave || saving)}>
            {saving ? "Saving..." : "Save & Generate Frames"}
          </button>

          <span style={{ fontSize: 12, color: "#666" }}>
            runId: <code>{runId}</code>
          </span>
        </div>

        <video
          ref={videoRef}
          controls
          style={{ width: "100%", borderRadius: 14, border: "1px solid #ddd", background: "#000" }}
        />

        <div style={{ fontSize: 12, color: "#444" }}>
          <div style={{ marginBottom: 6 }}>
            Tip: load the video by pasting the path above, then click play — once it loads, scrub and set impact.
          </div>
          {msg && <div style={{ padding: 10, borderRadius: 12, background: "#f6f6f6", border: "1px solid #e5e5e5" }}>{msg}</div>}
          {outDir && <div style={{ marginTop: 8 }}>Output: <code>{outDir}</code></div>}
        </div>
      </div>
    </div>
  );
}

function btn(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #222",
    background: disabled ? "#ddd" : "#111",
    color: disabled ? "#555" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    fontSize: 13
  };
}
