import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import ReportNavBar from "../components/ReportNavBar";
import ViewerBar from "../components/ViewerBar";
import P1P9Accordion, { type P1P9Item } from "../components/P1P9Accordion";

type ReportLike = {
  email?: string;
  name?: string;
  club?: string;
  handedness?: string;
  eye?: string;
  videoUrl?: string;
};

export default function ReportPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ---- styles (MUST be inside component body) ----
  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background:
      "radial-gradient(1100px 700px at 30% 10%, rgba(34,197,94,0.10), transparent 60%)," +
      "radial-gradient(900px 600px at 90% 10%, rgba(59,130,246,0.10), transparent 55%)," +
      "#050b16",
    color: "#e6edf6",
  };

  const main: React.CSSProperties = {
    minHeight: "100vh",
    backgroundImage:
      "linear-gradient(rgba(0,0,0,0.30), rgba(0,0,0,0.60)), url(/homepage-background.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    padding: 24,
  };

  const wrap: React.CSSProperties = {
    width: "100%",
    maxWidth: 1100,
    margin: "0 auto",
  };

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.32)",
    backdropFilter: "blur(10px)",
    padding: 16,
    boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
  };

  const h1: React.CSSProperties = { margin: "12px 0 8px 0", fontWeight: 950, letterSpacing: 0.2 };
  const small: React.CSSProperties = { fontSize: 12, opacity: 0.80, lineHeight: 1.5 };

  // ---- demo-ish data (you can wire to real report later) ----
  const report: ReportLike = useMemo(() => {
    const q = router.query || {};
    return {
      email: typeof q.email === "string" ? q.email : "",
      name: typeof q.name === "string" ? q.name : "",
      club: typeof q.club === "string" ? q.club : "",
      handedness: typeof q.hand === "string" ? q.hand : "Right-Handed",
      eye: typeof q.eye === "string" ? q.eye : "Right Eye",
      videoUrl: typeof q.video === "string" ? q.video : "",
    };
  }, [router.query]);

  const p1p9Items: P1P9Item[] = [
    { id:"P1", title:"Setup", subtitle:"Balanced, athletic posture with clean alignments.", status:"ON_TRACK",
      coachNotes:"Athletic posture, neutral pelvis, soft knees. Start clean.",
      commonMisses:["Ball too far back/forward","Grip too weak/strong for your pattern"],
      keyDrills:["Mirror setup check","Alignment sticks for feet/hips/shoulders"] },
    { id:"P2", title:"Shaft Parallel (Backswing)", subtitle:"Hands, club, and torso synced — no early throw.", status:"ON_TRACK",
      coachNotes:"Keep structure. Turn, don’t snatch.",
      commonMisses:["Inside takeaway","Face rolls open early"],
      keyDrills:["One-piece takeaway to P2","Wall drill: club outside hands"] },
    { id:"P3", title:"Lead Arm Parallel (Backswing)", subtitle:"Depth + width without losing posture.", status:"UNKNOWN",
      coachNotes:"Hands deep enough, chest still over the ball.",
      commonMisses:["Arms lift (no depth)","Early right-side bend"],
      keyDrills:["Split-hands depth drill","Trail-arm only rehearsal"] },
    { id:"P4", title:"Top", subtitle:"Coil loaded, pressure ready to shift.", status:"UNKNOWN",
      coachNotes:"Finish the turn, keep pressure under trail foot but ready to move.",
      commonMisses:["Overrun/overswing","Across-the-line"],
      keyDrills:["3-second top pause","Top-to-P5 pump"] },
    { id:"P5", title:"Lead Arm Parallel (Downswing)", subtitle:"Get left before you rotate.", status:"NEEDS_ATTENTION",
      coachNotes:"Priority: pressure shift left THEN unwind. Don’t spin in place.",
      commonMisses:["Early rotation (stuck arms)","Handle stalls/flip"],
      keyDrills:["Step-change drill","Pump to P5, then go"] },
    { id:"P6", title:"Shaft Parallel (Downswing)", subtitle:"Delivery: path, face, and low point control.", status:"UNKNOWN",
      coachNotes:"Club under hands, chest opening, pressure left.",
      commonMisses:["Over-the-top","Late steepening"],
      keyDrills:["9-to-3 drill","Split-stance delivery reps"] },
    { id:"P7", title:"Impact", subtitle:"Forward shaft lean + centered strike.", status:"UNKNOWN",
      coachNotes:"Handle ahead, trail wrist bent, chest slightly open.",
      commonMisses:["Early extension","Flip / scooping"],
      keyDrills:["Impact bag","Line-in-sand low point"] },
    { id:"P8", title:"Trail Arm Parallel (Follow-through)", subtitle:"Spine-angle match + extension.", status:"ON_TRACK",
      coachNotes:"Extend through, don’t dump angles.",
      commonMisses:["Chicken wing","Stall + flip"],
      keyDrills:["Release to P8 checkpoint","Finish-hold drill"] },
    { id:"P9", title:"Finish", subtitle:"Balanced, tall, and posted.", status:"ON_TRACK",
      coachNotes:"Hold your finish like a statue (a cool statue).",
      commonMisses:["Falling back","Over-rotating without balance"],
      keyDrills:["3-sec finish hold","Feet-together swings"] },
  ];

  // autoplay attempt if a video is present
  useEffect(() => {
    if (!report.videoUrl) return;
    const t = setTimeout(() => { try { videoRef.current?.play(); } catch {} }, 120);
    return () => clearTimeout(t);
  }, [report.videoUrl]);

  return (
    <div style={shell}>
      <Head><title>Virtual Coach AI — Report</title></Head>

      <main style={main}>
        <div style={wrap}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <img src="/virtualcoach-logo-transparent.png" alt="Virtual Coach AI" style={{ maxWidth: 420, width: "92%" }} />
          </div>

          <div style={card}>
            <h1 style={h1}>Swing Report</h1>
            <div style={small}>
              Eye: <strong>{report.eye || "—"}</strong> &nbsp;•&nbsp;
              Handedness: <strong>{report.handedness || "—"}</strong> &nbsp;•&nbsp;
              Club: <strong>{report.club || "—"}</strong>
            </div>

            <div style={{ marginTop: 14 }}>
              <ReportNavBar onJumpVideo={() => {
                const el = document.getElementById("videoPanel");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }} />
            </div>

            <div id="videoPanel" style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Video</div>
              {report.videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    controls
                    playsInline
                    preload="metadata"
                    style={{ width: "100%", borderRadius: 14, background: "#000" }}
                    src={report.videoUrl}
                  />
                  <ViewerBar videoRef={videoRef} />
                </>
              ) : (
                <div style={{ ...small, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.04)" }}>
                  No video attached on this view yet. (That’s okay — we can wire it to the upload flow next.)
                </div>
              )}
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>P1–P9 Checkpoints</div>
              <P1P9Accordion items={p1p9Items} defaultMode="single" showExpandAll autoOpenPriority={true} priorityId="P5" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}