import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";

export default function Home() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const vidRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    // revoke old preview
    if (src) URL.revokeObjectURL(src);

    const url = URL.createObjectURL(f);
    setSrc(url);
    setFileName(f.name);

    // auto play preview if possible
    setTimeout(() => {
      try {
        vidRef.current?.load();
      } catch {}
    }, 0);
  }

  const bg = "/golf-course-bg.jpg"; // ensure this exists in /public

  return (
    <>
      <Head>
        <title>Virtual Coach AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main
        style={{
          minHeight: "100vh",
          backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: 24,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 1100 }}>
          <div style={{ paddingTop: 24, paddingBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src="/virtualcoach-logo-transparent.png"
                alt="Virtual Coach AI"
                style={{ height: 52, width: "auto" }}
              />
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: 0.2 }}>
                Virtual Coach AI
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: 18,
              alignItems: "start",
            }}
          >
            {/* LEFT: hero copy */}
            <section
              style={{
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.28)",
                boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
                padding: 22,
                color: "#fff",
              }}
            >
              <div style={{ opacity: 0.9, fontSize: 14, letterSpacing: 0.3 }}>
                Simple. Fast. No nonsense.
              </div>
              <h1 style={{ margin: "10px 0 10px", fontSize: 44, lineHeight: 1.05 }}>
                Upload your swing.
                <br />
                Get a full report.
              </h1>

              <p style={{ margin: "10px 0 16px", fontSize: 16, opacity: 0.92, maxWidth: 640 }}>
                P1–P9 sequence, fault priorities, and a short practice plan. Built for golfers who want
                answers — not a PhD in “hinge torque.”
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                <Link
                  href="/upload"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 44,
                    padding: "0 18px",
                    borderRadius: 12,
                    background: "#22c55e",
                    color: "#06210f",
                    fontWeight: 900,
                    textDecoration: "none",
                    boxShadow: "0 14px 26px rgba(0,0,0,0.35)",
                  }}
                >
                  Go to Upload
                </Link>

                <a
                  href="/report"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 44,
                    padding: "0 18px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.22)",
                    color: "#fff",
                    fontWeight: 800,
                    textDecoration: "none",
                  }}
                >
                  View Sample Report
                </a>
              </div>

              <div style={{ marginTop: 14, fontSize: 13, opacity: 0.85 }}>
                Tip: MP4 / MOV recommended. Face-on or down-the-line.
              </div>
            </section>

            {/* RIGHT: video preview window */}
            <section
              style={{
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.28)",
                boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
                padding: 16,
                color: "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>Swing video preview</div>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 36,
                    padding: "0 12px",
                    borderRadius: 10,
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.22)",
                    fontWeight: 800,
                  }}
                >
                  Choose video
                  <input
                    type="file"
                    accept="video/*"
                    onChange={onPick}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              <div style={{ marginTop: 10, opacity: 0.8, fontSize: 12 }}>
                {fileName ? `Selected: ${fileName}` : "No video selected yet."}
              </div>

              <div style={{ marginTop: 12 }}>
                <video
                  ref={vidRef}
                  controls
                  playsInline
                  preload="metadata"
                  src={src || undefined}
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    background: "#000",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                />
              </div>

              <div style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
                When you’re ready, hit <b>Go to Upload</b> and submit the real one.
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
