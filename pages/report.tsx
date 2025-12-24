import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Disclosure from "../components/Disclosure";


export default function ReportPage() {
  const router = useRouter();

  // --- VCA MVP: bring chosen upload preview into report via sessionStorage ---
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

useEffect(() => {
  // Demo fallback so the report never looks empty
  if (!previewUrl) setPreviewUrl("/test_clip.mp4");
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);// --- MVP fake AI payload (from public/mvp-report.json) ---
  const [mvpReport, setMvpReport] = useState<any>(null);useEffect(() => {
  try {
    if (typeof window === "undefined") return;

    // Preferred: data URL base64 (survives navigation)
    const dataUrl = sessionStorage.getItem("vca_video_base64");
    if (dataUrl) {
      setPreviewUrl(dataUrl);
      return;
    }

    // Fallback: blob URL (may not survive reloads, but helps if you used it earlier)
    const blobUrl = sessionStorage.getItem("vca_previewUrl");
    if (blobUrl) setPreviewUrl(blobUrl);
  } catch {}
}, []);

  const name = (router.query.name as string) || "Player";
  const eye = (router.query.eye as string) || "Right Eye";
  const hand = (router.query.hand as string) || "Right-Handed";
  const club = (router.query.club as string) || "";
  const notes = (router.query.notes as string) || "";

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background:
      "radial-gradient(1100px 700px at 30% 10%, rgba(34,197,94,0.10), transparent 60%), radial-gradient(900px 600px at 90% 10%, rgba(59,130,246,0.10), transparent 55%), #050b16",
    color: "#e6edf6",
    padding: "26px 18px 60px",
  };

  const max: React.CSSProperties = { maxWidth: 1200, margin: "0 auto" };

  const topbar: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  };

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    backdropFilter: "blur(10px)",
  };

  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: 14,
  };

  const chip: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    opacity: 0.9,
  };

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
  };

  return (
    <>
      <Head>
        <title>Report | Virtual Coach AI</title>
      </Head>

      <main style={{ minHeight: "100vh", padding: "26px 18px 60px" }}>
        <div style={max}>
          <div style={topbar}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "rgba(34,197,94,0.22)",
                  border: "1px solid rgba(34,197,94,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                }}
              >
                VC
              </div>
              <div>
                <div style={{ fontWeight: 900 }}>VIRTUAL COACH AI</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Tour-level swing feedback from a single upload
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Link href="/" style={btn}>
                ← Back to home
              </Link>
              <Link href="/upload" style={btn}>
                Upload another swing
              </Link>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.print();
                }}
                style={{ ...btn, background: "rgba(34,197,94,0.14)", borderColor: "rgba(34,197,94,0.35)" }}
              >
                Print report
              </a>
            </div>
          </div>

          <div style={grid}>
            {/* Summary / scores */}
            <section style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, letterSpacing: 3, opacity: 0.7 }}>PLAYER OVERVIEW</div>
                  <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{name}</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={chip}>{hand}</span>
                    <span style={chip}>{eye}</span>
                    {club ? <span style={chip}>{club}</span> : null}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Swing Score</div>
                  <div style={{ fontSize: 34, fontWeight: 1000 }}>A-</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Demo score (wiring next)</div>
                </div>
              </div>

              {notes ? (
                <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
                  <strong>Focus request:</strong> {notes}
                </div>
              ) : null}

              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {["Speed", "Control", "Consistency"].map((k) => (
                  <div
                    key={k}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.18)",
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{k}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, marginTop: 6 }}>B+</div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.10)",
                        marginTop: 10,
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ width: "72%", height: "100%", background: "rgba(34,197,94,0.65)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* VIDEO WINDOW (we keep this) */}
            <section style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, opacity: 0.9 }}>SWING VIDEO</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Video window stays here. Wiring to upload next.
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.8,
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 999,
                    padding: "6px 10px",
                  }}
                >
                  MVP
                </div>
              </div>

              {/* If we have previewUrl, show video. Otherwise show clean placeholder. */}
              {previewUrl ? (
                <div style={{ height: 360, borderRadius: 16, overflow: "hidden", background: "#000", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                    preload="metadata"
                    style={{ width: "100%", height: "100%", display: "block" }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    height: 360,
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.30)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: 16,
                  }}
                >
                  <div style={{ opacity: 0.75 }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>No video attached (yet)</div>
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                      Upload a swing to preview it here. Next: replace this local preview with Mux playback and P1–P9 sync.
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75, lineHeight: 1.5 }}>
                This is where we’ll put the <strong>impact-centered, short, never-cuts-downswing</strong> clip (your north star).
              </div>
            </section>
          </div>

          {/* Apple-style collapsed section */}
          <div style={{ marginTop: 14 }}>
            <Disclosure
              title="P1–P9 Checkpoints"
              subtitle="Tap to expand. We’ll keep details tucked away unless you ask."
              defaultOpen={false}
              persistKey="report_p1p9"
            >
              <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.6 }}>
  <div style={{ fontWeight: 900, marginBottom: 6 }}>MVP AI Preview (stub)</div>

  {!mvpReport ? (
    <div style={{ opacity: 0.75 }}>Loading stub report…</div>
  ) : (
    <>
      <div style={{ marginBottom: 10 }}>
        <div><strong>Top faults:</strong></div>
        <ul style={{ margin: "6px 0 0 0", paddingLeft: 18 }}>
          {mvpReport.topFaults?.slice(0, 3).map((t: string, i: number) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 10 }}>
        <div><strong>Priority drill:</strong> {mvpReport.priorityFix?.title}</div>
        <div style={{ marginTop: 6 }}><strong>How:</strong> {mvpReport.priorityFix?.how}</div>
        <div style={{ marginTop: 6 }}><strong>Why:</strong> {mvpReport.priorityFix?.why}</div>
      </div>

      <div style={{ marginTop: 12, opacity: 0.85 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>P1–P9 notes (stub)</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {mvpReport.p1p9?.map((x: any, i: number) => (
            <li key={i}><strong>{x.p}:</strong> {x.note}</li>
          ))}
        </ul>
      </div>
    </>
  )}
</div></Disclosure>
          </div>
        </div>
      </main>
    </>
  );
}







