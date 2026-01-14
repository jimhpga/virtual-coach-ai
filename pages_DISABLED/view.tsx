import { useEffect, useMemo, useRef, useState } from "react";
import BrandShell from "../components/BrandShell";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

export default function ViewPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Accept either a query param (url) or sessionStorage (previewUrl/base64)
  const [src, setSrc] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      // 1) query param
      const q = (router.query.v as string) || "";
      if (q) {
        setSrc(q);
        return;
      }

      // 2) session storage: base64 preferred
      if (typeof window !== "undefined") {
        const dataUrl = window.sessionStorage.getItem("vca_video_base64");
        if (dataUrl) {
          setSrc(dataUrl);
          return;
        }
        const blobUrl = window.sessionStorage.getItem("vca_previewUrl");
        if (blobUrl) {
          setSrc(blobUrl);
          return;
        }
      }

      // 3) fallback demo clip
      setSrc("/test_clip.mp4");
    } catch {
      setSrc("/test_clip.mp4");
    }
  }, [router.query.v]);

  const shell: React.CSSProperties = useMemo(
    () => ({
      minHeight: "100vh",
      background:
        "radial-gradient(1100px 700px at 30% 10%, rgba(34,197,94,0.10), transparent 60%), radial-gradient(900px 600px at 90% 10%, rgba(59,130,246,0.10), transparent 55%), #050b16",
      color: "#e6edf6",
      padding: "26px 18px 60px",
    }),
    []
  );

  const max: React.CSSProperties = useMemo(() => ({ maxWidth: 980, margin: "0 auto" }), []);
  const card: React.CSSProperties = useMemo(
    () => ({
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 18,
      padding: 16,
      boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
      backdropFilter: "blur(10px)",
    }),
    []
  );

  const btn: React.CSSProperties = useMemo(
    () => ({
      height: 36,
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
    }),
    []
  );

  return (
    <>
      <Head>
        <title>View | Virtual Coach AI</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <BrandShell title="View">
<main style={shell}>
        <div style={max}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900, letterSpacing: 0.5 }}>VIEW CLIP</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Scrub, slow down, and live at impact like a normal person.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/report" style={btn}>
                �f¢â�,� �, Back to report
              </Link>
              <Link href="/" style={btn}>
                Home
              </Link>
            </div>
          </div>

          <div style={{ height: 14 }} />

          <section style={card}>
            <div
              style={{
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#000",
              }}
            >
              <video
                ref={videoRef}
                src={src}
                controls
                playsInline
                preload="metadata"
                onCanPlay={() => setReady(true)}
                style={{ width: "100%", display: "block", maxHeight: 520 }}
              />
            </div>

            <div style={{ height: 12 }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {ready ? "Tip: Use comma/period keys too ( , . ) if your keyboard supports it." : "Loading video�f¢â�?s¬�,¦"}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  style={btn}
                  onClick={() => {
                    try {
                      const v = videoRef.current;
                      if (v) v.currentTime = Math.max(0, (v.currentTime || 0) - 0.04);
                    } catch {}
                  }}
                >
                  {"< frame"}
                </button>

                <button
                  style={{ ...btn, borderColor: "rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.14)" }}
                  onClick={() => {
                    try {
                      const v = videoRef.current;
                      if (v) v.currentTime = (v.currentTime || 0) + 0.04;
                    } catch {}
                  }}
                >
                  {"frame >"}
                </button>
              </div>
            </div>
          </section>

          <div style={{ height: 14 }} />

          <div style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.6 }}>
            Next: this page becomes the �f¢â�?s¬�.�?oimpact-centered, short, never-cuts-downswing�f¢â�?s¬�, clip viewer with anchors + P1�f¢â�?s¬â�,��"P9 sync.
          </div>
        </div>
      </main>
</BrandShell>
    </>
  );
}
