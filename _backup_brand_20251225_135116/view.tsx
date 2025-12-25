import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

export default function ViewPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [src, setSrc] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // 1) Prefer query param ?src=
  const querySrc = useMemo(() => {
    const q = router.query.src;
    if (!q) return "";
    const val = Array.isArray(q) ? q[0] : q;
    try { return decodeURIComponent(String(val)); } catch { return String(val); }
  }, [router.query.src]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // If query src exists, use it.
    if (querySrc) {
      setSrc(querySrc);
      return;
    }

    // Otherwise mirror report.tsx behavior (so /view never feels broken)
    try {
      const dataUrl = sessionStorage.getItem("vca_video_base64");
      if (dataUrl) { setSrc(dataUrl); return; }

      const blobUrl = sessionStorage.getItem("vca_previewUrl");
      if (blobUrl) { setSrc(blobUrl); return; }

      // fallback demo
      setSrc("/test_clip.mp4");
    } catch {
      setSrc("/test_clip.mp4");
    }
  }, [querySrc]);

  // Local file picker fallback (lets a user play a downloaded clip)
  const handlePick = (file: File | null) => {
    setErr("");
    if (!file) return;
    try {
      const url = URL.createObjectURL(file);
      setSrc(url);
      // auto play (best effort)
      setTimeout(() => { try { videoRef.current?.play(); } catch {} }, 80);
    } catch (e: any) {
      setErr(e?.message || "Could not load file.");
    }
  };

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background:
      "radial-gradient(1100px 700px at 30% 10%, rgba(34,197,94,0.10), transparent 60%), radial-gradient(900px 600px at 90% 10%, rgba(59,130,246,0.10), transparent 55%), #050b16",
    color: "#e6edf6",
    padding: "26px 18px 60px",
  };

  const max: React.CSSProperties = { maxWidth: 1200, margin: "0 auto" };

  const btn: React.CSSProperties = {
    height: 34,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "#e6edf6",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
    gap: 8,
  };

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    backdropFilter: "blur(10px)",
  };

  return (
    <>
      <Head>
        <title>Viewer | Virtual Coach AI</title>
      </Head>

      <main style={shell}>
        <div style={max}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 900, letterSpacing: 2, opacity: 0.8 }}>VIRTUAL COACH AI</div>
              <div style={{ fontSize: 22, fontWeight: 1000, marginTop: 6 }}>Swing Viewer</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                Scrub, slow down, and live at impact like a normal person. 🙂
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Link href="/report" style={btn}>← Back to report</Link>
              <Link href="/upload" style={btn}>Upload another swing</Link>
              <button
                style={{ ...btn, borderColor: "rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.14)" }}
                onClick={() => { try { var v = videoRef.current; if(v){ v.currentTime = Math.max(0, (v.currentTime || 0) - 0.04); } } catch {} }}
              >
                ◀ frame
              </button>
              <button
                style={{ ...btn, borderColor: "rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.14)" }}
                onClick={() => { try { var v = videoRef.current; if(v){ v.currentTime = (v.currentTime || 0) + 0.04; } } catch {} }}
              >
                frame ▶
              </button>
            </div>
          </div>

          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ fontWeight: 900, opacity: 0.9 }}>PLAYBACK</div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ fontSize: 12, opacity: 0.8 }}>
                  <input
                    type="file"
                    accept="video/*"
                    style={{ display: "none" }}
                    onChange={(e) => handlePick(e.target.files?.[0] || null)}
                  />
                  <span style={{ ...btn, height: 32 }}>Choose local video</span>
                </label>

                <select
                  style={{ ...btn, height: 32 }}
                  defaultValue="0.5"
                  onChange={(e) => { try { if (videoRef.current) videoRef.current.playbackRate = Number(e.target.value); } catch {} }}
                >
                  <option value="0.25">0.25×</option>
                  <option value="0.5">0.5×</option>
                  <option value="0.75">0.75×</option>
                  <option value="1">1×</option>
                </select>
              </div>
            </div>

            {err ? <div style={{ color: "#ffb4b4", fontSize: 12, marginBottom: 10 }}>{err}</div> : null}

            <div style={{ height: 520, borderRadius: 16, overflow: "hidden", background: "#000", border: "1px solid rgba(255,255,255,0.12)" }}>
              <video
                ref={videoRef}
                src={src}
                controls
                playsInline
                preload="metadata"
                style={{ width: "100%", height: "100%", display: "block" }}
              />
            </div>

            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75, lineHeight: 1.5 }}>
              Tip: if someone downloaded their clip, they can hit <strong>Choose local video</strong> and watch it here with no drama.
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
