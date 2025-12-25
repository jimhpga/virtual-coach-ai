import { useRef, useEffect, useState } from "react";
import P1P9Accordion, { type P1P9Item } from "../components/P1P9Accordion";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Disclosure from "../components/Disclosure";
import ReportNavBar from "../components/ReportNavBar";
import ViewerBar from "../components/ViewerBar";




export default function ReportPage() {
  const router = useRouter();

  


  // --- VCA: Sticky viewer + checkpoint seek sync ---
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const scrollToViewer = () => {
    setTimeout(() => {
      try { viewerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch {}
    }, 60);
  };

  const seekByCheckpoint = (id: string) => {
    const v = videoRef.current;
    if (!v) return;
    const d = v.duration;
    if (!Number.isFinite(d) || d <= 0) return;

    const norm = String(id || "").toUpperCase();

    // MVP mapping: get them into the action fast (tune later)
    let pct: number | null = null;
    if (norm === "P5") pct = 0.65;      // transition/early downswing window
    else if (norm === "P7") pct = 0.80; // impact window

    if (pct === null) return;

    try {
      v.currentTime = Math.max(0, Math.min(d - 0.05, d * pct));
    } catch {}
  };

  useEffect(() => {
    const handler = (e: any) => {
      const id = e?.detail?.id ?? e?.detail ?? "";
      if (!id) return;
      // make sure viewer is visible when a priority opens
      scrollToViewer();
      // then nudge the clip to the right part
      setTimeout(() => seekByCheckpoint(String(id)), 120);
    };

    try {
      if (typeof window === "undefined") return;
      window.addEventListener("vca:p1p9_open", handler as any);
      return () => window.removeEventListener("vca:p1p9_open", handler as any);
    } catch {
      return;
    }
  }, []);
const p1p9ScrollRef = useRef<HTMLDivElement | null>(null);

const handleP1P9Toggle = (open: boolean) => {
  if (!open) return;
  setTimeout(() => {
    try { p1p9ScrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch {}
  }, 80);
};
// --- VCA MVP: bring chosen upload preview into report via sessionStorage ---
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);


  const jumpToVideo = () => {
    try {
      const el = document.getElementById("vca_video");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {}
  };// --- MVP fake AI payload (from public/mvp-report.json) ---
  const [mvpReport, setMvpReport] = useState<any>(null);useEffect(() => {
  try {
    if (typeof window === "undefined") return;

    const dataUrl = sessionStorage.getItem("vca_video_base64");
    if (dataUrl) {
      setPreviewUrl(dataUrl);
      return;
    }

    const blobUrl = sessionStorage.getItem("vca_previewUrl");
    if (blobUrl) {
      setPreviewUrl(blobUrl);
      return;
    }

    setPreviewUrl("/test_clip.mp4");
  } catch {
    setPreviewUrl("/test_clip.mp4");
  }
}, []);const name = (router.query.name as string) || "Player";
  const eye = (router.query.eye as string) || "Right Eye";
  const hand = (router.query.hand as string) || "Right-Handed";
  const club = (router.query.club as string) || "";
  const notes = (router.query.notes as string) || "";


  const p1p9Items: P1P9Item[] = [
    { id:"P1", title:"Setup", subtitle:"Balanced, athletic posture with clean alignments.", status:"ON_TRACK",
      coachNotes:"Balanced, athletic posture with clean alignments.",
      commonMisses:["Ball too far back","Grip too weak/strong for pattern"],
      keyDrills:["Mirror setup check","Alignment stick for feet/hips/shoulders"]
    },
    { id:"P2", title:"Shaft parallel backswing", subtitle:"Clubhead tracks nicely with stable face control.", status:"ON_TRACK",
      coachNotes:"Clubhead tracks nicely along the target line with good face control.",
      commonMisses:["Club rolling inside early","Getting too steep by P2"],
      keyDrills:["Low-and-slow takeaway","Alignment rod on ground (hands/club path)"]
    },
    { id:"P3", title:"Lead arm parallel backswing", subtitle:"Good width and depth with solid coil potential.", status:"ON_TRACK",
      coachNotes:"Good width and depth with plenty of rotation and coil potential.",
      commonMisses:["Lead arm collapses and loses width","Trail leg locks early"],
      keyDrills:["Wall drill (turn with space)","Towel-under-arms connection"]
    },
    { id:"P4", title:"Top of swing", subtitle:"Playable top position with good structure.", status:"ON_TRACK",
      coachNotes:"Plenty of turn with a playable club position at the top.",
      commonMisses:["Across-the-line when rushed","Over-long backswing when tempo gets fast"],
      keyDrills:["3-to-1 tempo rehearsal","Pause-at-the-top swing"]
    },
    { id:"P5", title:"Lead arm parallel downswing", subtitle:"Club gets a touch steep under pressureÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Âeasy fix.", status:"NEEDS_ATTENTION",
      coachNotes:"Club is close to on-plane but can get just a touch steep under pressure.",
      commonMisses:["Upper body dives toward ball","Club drops too far outside hands"],
      keyDrills:["Pump drill (rehearse shallow)","Feet-together transition drill"]
    },
    { id:"P6", title:"Shaft parallel downswing", subtitle:"Face/path playable but can get slightly steep.", status:"NEEDS_ATTENTION",
      coachNotes:"Face and path are playable but a fraction steep can steal compression.",
      commonMisses:["Handle gets too high at P6","Trail shoulder drives down"],
      keyDrills:["Headcover just outside ball line","Split-hand rehearsal"]
    },
    { id:"P7", title:"Impact", subtitle:"Generally square with decent shaft lean and compression.", status:"ON_TRACK",
      coachNotes:"Clubface is generally square with decent shaft lean and compression.",
      commonMisses:["Low-point drifts back","Hanging back adds loft"],
      keyDrills:["Divot-forward drill","Impact tape + strike pattern"]
    },
    { id:"P8", title:"Trail arm parallel follow-through", subtitle:"Arms/body sync with a clean extension.", status:"ON_TRACK",
      coachNotes:"Arms and body are synced with a clean extension toward target.",
      commonMisses:["Club exits too low/left when held on","Arms outrace body"],
      keyDrills:["Hold P8 for 2 seconds","Throw-the-club (feel sequence)"]
    },
    { id:"P9", title:"Finish", subtitle:"Balanced full finish with chest to target.", status:"ON_TRACK",
      coachNotes:"Balanced, full finish with chest facing the target and weight left.",
      commonMisses:["Falling toward toes/heels","Stopping rotation early"],
      keyDrills:["Hold finish 3-count","Eyes-closed finish balance"]
    }
  ];
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
    <ReportNavBar onJumpVideo={jumpToVideo} />
    <ReportNavBar onJumpVideo={jumpToVideo} />
    <Head>
        <title>Report | Virtual Coach AI</title>
      </Head>

      <main style={shell}>
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
                ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Ãƒâ€šÃ‚Â Back to home
              </Link>
              <Link href="/upload" style={btn}>
                Upload another swing
              </Link>
              <Link
                href={previewUrl ? `/view?src=${encodeURIComponent(previewUrl)}` : "/view"}
                style={{ ...btn, borderColor: "rgba(59,130,246,0.35)", background: "rgba(59,130,246,0.14)" }}
              >
                View swing (viewer)
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
              <Link href="/view" style={{ ...btn, background: "rgba(59,130,246,0.12)", borderColor: "rgba(59,130,246,0.30)" }}>
                View swing
              </Link>
            </div>
          </div>

          <div style={grid}>
            {/* Summary / scores */}
            <section ref={viewerRef} style={{ ...card, position: "sticky", top: 14, alignSelf: "start" }}>
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
                  <video id="vca_video"
                    ref={videoRef} src={previewUrl}
                    controls
                    playsInline
                    preload="metadata"
                    style={{ width: "100%", height: "100%", display: "block" }}
                  />
                
                  <ViewerBar videoRef={videoRef} />
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
                      Upload a swing to preview it here. Next: replace this local preview with Mux playback and P1ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œP9 sync.
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75, lineHeight: 1.5 }}>
                This is where weÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ll put the <strong>impact-centered, short, never-cuts-downswing</strong> clip (your north star).
              </div>
            </section>
          </div>

          {/* Apple-style collapsed section */}
          <div style={{ marginTop: 14 }}>
            <Disclosure
              title="P1ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œP9 Checkpoints"
              subtitle="Tap to expand. WeÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ll keep details tucked away unless you ask."
              defaultOpen={false}
              persistKey="report_p1p9"
             onToggle={handleP1P9Toggle}>
              <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.6 }}>
  <div style={{ fontWeight: 900, marginBottom: 6 }}>MVP AI Preview (stub)</div>

  {!mvpReport ? (
    <div style={{ opacity: 0.75 }}>Loading stub reportÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦</div>
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

      <div style={{ marginTop: 12 }}>  <div ref={p1p9ScrollRef} style={{ marginTop: 10 }}>

  <P1P9Accordion items={p1p9Items} defaultMode="single" showExpandAll={true} autoOpenPriority={true} priorityId="P5" />

  </div>
</div></>
  )}
</div></Disclosure>
          </div>
        </div>
      </main>
    </>
  );
}



















