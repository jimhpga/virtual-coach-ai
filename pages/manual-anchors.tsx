// pages/manual-anchors.tsx
"use client";
import { useState } from "react";

export default function ManualAnchors() {
  const [videoPath, setVideoPath] = useState("");
  const [backswingStartSec, setBackswingStartSec] = useState("0.0");
  const [topSec, setTopSec] = useState("");
  const [impactSec, setImpactSec] = useState("0.0");
  const [postSec, setPostSec] = useState("0.5");
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");

  async function gen() {
    setMsg("");
    setClipUrl(null);

    const body: any = {
      videoPath,
      backswingStartSec: Number(backswingStartSec),
      impactSec: Number(impactSec),
      postSec: Number(postSec),
      runId: "MORNING_FIX",
    };
    if (topSec.trim()) body.topSec = Number(topSec);

    const r = await fetch("/api/anchor-clip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) {
      setMsg(data?.error ? `${data.error}\n${data.details ?? ""}` : "Failed");
      return;
    }
    setClipUrl(data.clipUrl);
    setMsg("✅ Created: " + data.clipUrl);
  }

  return (
    <div style={{ padding: 18, maxWidth: 900, margin: "0 auto", fontFamily: "system-ui" }}>
      <h2>Manual Anchors Clip Generator</h2>
      <p>Enter anchors (seconds). This is the “slow-mo proof” fallback.</p>

      <div style={{ display: "grid", gap: 10 }}>
        <label>
          VideoPath (absolute):
          <input style={{ width: "100%" }} value={videoPath} onChange={(e) => setVideoPath(e.target.value)} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label>
            BackswingStartSec:
            <input value={backswingStartSec} onChange={(e) => setBackswingStartSec(e.target.value)} />
          </label>
          <label>
            ImpactSec:
            <input value={impactSec} onChange={(e) => setImpactSec(e.target.value)} />
          </label>
          <label>
            TopSec (optional):
            <input value={topSec} onChange={(e) => setTopSec(e.target.value)} />
          </label>
          <label>
            PostSec:
            <input value={postSec} onChange={(e) => setPostSec(e.target.value)} />
          </label>
        </div>

        <button onClick={gen} style={{ padding: "10px 12px", borderRadius: 10, fontWeight: 700 }}>
          Generate Clip
        </button>

        {msg ? <pre style={{ whiteSpace: "pre-wrap" }}>{msg}</pre> : null}

        {clipUrl ? (
          <div>
            <a href={clipUrl} target="_blank" rel="noreferrer">{clipUrl}</a>
            <video src={clipUrl} controls style={{ width: "100%", marginTop: 10 }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
