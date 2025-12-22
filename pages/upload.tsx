import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

export default function UploadPage() {
  const router = useRouter();
  const eye = (router.query.eye as string) || "Right Eye";
  const hand = (router.query.hand as string) || "Right-Handed";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [club, setClub] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background: "radial-gradient(1200px 800px at 20% 10%, rgba(34,197,94,0.12), transparent 60%), radial-gradient(900px 600px at 90% 20%, rgba(56,189,248,0.10), transparent 55%), #050b16",
    color: "#e6edf6",
    padding: "44px 22px",
  };

  const top: React.CSSProperties = { maxWidth: 1200, margin: "0 auto 18px auto" };
  const h1: React.CSSProperties = { fontSize: 44, margin: "10px 0 8px 0", fontWeight: 900, letterSpacing: -0.8 };
  const sub: React.CSSProperties = { opacity: 0.85, maxWidth: 840, lineHeight: 1.5 };

  const row: React.CSSProperties = {
    maxWidth: 1200,
    margin: "22px auto 0 auto",
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: 18,
  };

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    backdropFilter: "blur(10px)",
  };

  const pillRow: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 };
  const pill: React.CSSProperties = {
    fontSize: 12,
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid rgba(34,197,94,0.35)",
    background: "rgba(34,197,94,0.10)",
    color: "#bff7d4",
  };

  const label: React.CSSProperties = { fontSize: 13, opacity: 0.9, marginBottom: 6 };
  const input: React.CSSProperties = {
    width: "100%",
    height: 40,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "#e6edf6",
    padding: "0 12px",
    outline: "none",
  };

  const textarea: React.CSSProperties = {
    width: "100%",
    minHeight: 96,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "#e6edf6",
    padding: "10px 12px",
    outline: "none",
    resize: "vertical",
  };

  const drop: React.CSSProperties = {
    border: "1px dashed rgba(255,255,255,0.22)",
    borderRadius: 16,
    padding: 18,
    textAlign: "center",
    background: "rgba(0,0,0,0.22)",
  };

  const btn: React.CSSProperties = {
    marginTop: 14,
    height: 46,
    padding: "0 18px",
    borderRadius: 14,
    border: "none",
    background: "#22c55e",
    color: "#05210f",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
  };

  function onPick(f: File | null) {
    if (!f) return;
    setFile(f);
  }

  async function onSubmit() {
    // MVP: route to report with basic params (backend wiring later)
    router.push({
      pathname: "/report",
      query: {
        eye,
        hand,
        name: name || "Player",
        email,
        club,
        notes,
      },
    });
  }

  return (
    <>
     I()
      <Head>
        <title>Upload Your Swing | Virtual Coach AI</title>
      </Head>

      <main style={shell}>
        <div style={top}>
          <div style={{ letterSpacing: 4, opacity: 0.75, fontSize: 12 }}>VIRTUAL COACH AI</div>
          <div style={h1}>Upload Your Swing</div>
          <div style={sub}>
            Drag in a face-on or down-the-line clip. We&apos;ll extract your P1–P9 checkpoints, find your top 2–3 faults, and build a simple practice plan.
          </div>
          <div style={pillRow}>
            <span style={pill}>P1–P9 checkpoints</span>
            <span style={pill}>Power &amp; efficiency score</span>
            <span style={pill}>Drill prescriptions</span>
            <span style={pill}>PDF report + email</span>
          </div>
          <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
            <Link href="/" style={{ color: "#bfe7ff", textDecoration: "none" }}>← Back to home</Link>{" "}
            <span style={{ marginLeft: 10 }}>|</span>{" "}
            <span style={{ marginLeft: 10 }}>Eye: <strong>{eye}</strong> • Hand: <strong>{hand}</strong></span>
          </div>
        </div>

        <div style={row}>
          {/* Left: form */}
          <section style={card}>
            <div style={{ fontWeight: 900, marginBottom: 10, opacity: 0.9 }}>1. CHOOSE YOUR SWING VIDEO</div>

            <div style={drop}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Click to browse or drag &amp; drop a video file</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>MP4 / MOV recommended • Ideally 1–3 seconds from setup to finish</div>

              <input
                type="file"
                accept="video/mp4,video/quicktime,video/*"
                style={{ marginTop: 12 }}
                onChange={(e) => onPick(e.target.files?.[0] || null)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
              <div>
                <div style={label}>Your name (optional)</div>
                <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jim H." />
              </div>
              <div>
                <div style={label}>Email for report</div>
                <input style={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <div style={label}>Club used (optional)</div>
                <input style={input} value={club} onChange={(e) => setClub(e.target.value)} placeholder="Driver, 7 iron, etc." />
              </div>
              <div>
                <div style={label}>Handedness</div>
                <input style={input} value={hand} readOnly />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={label}>Anything specific you want us to look at?</div>
              <textarea style={textarea} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Driver consistency, early extension, face control, etc." />
            </div>

            <button style={btn} onClick={onSubmit} disabled={!file}>
              Upload &amp; analyze swing
            </button>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
              Pilot phase: we&apos;ll process your swing, build your report, and email you a link. No spam, no sharing.
            </div>
          </section>

          {/* Right: preview */}
          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 900, opacity: 0.9 }}>LIVE PREVIEW</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>You&apos;ll see your swing here once a file is selected.</div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "6px 10px" }}>
                {file ? "Ready" : "Waiting for file..."}
              </div>
            </div>

            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.30)", padding: 12 }}>
              {!previewUrl ? (
                <div style={{ height: 340, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", opacity: 0.65, padding: 18 }}>
                  <div>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>No file selected yet</div>
                    <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                      Drop a swing video on the left and you&apos;ll see it here before we upload it.
                      <br />
                      Tip: a clean single-swing clip (setup → finish) makes analysis easier.
                    </div>
                  </div>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  src={previewUrl}
                  controls
                  playsInline
                  preload="metadata"
                  style={{ width: "100%", height: 340, objectFit: "contain", borderRadius: 12, background: "#000" }}
                />
              )}
            </div>

            <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12, fontSize: 12, opacity: 0.75, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 900, opacity: 0.9, marginBottom: 6 }}>What happens next?</div>
              <div>1. We upload and store your swing securely.</div>
              <div>2. AI extracts your P1–P9 positions and core metrics.</div>
              <div>3. We score your swing and flag the top 2–3 faults.</div>
              <div>4. You get a drill-based plan to fix them.</div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}