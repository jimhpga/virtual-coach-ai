import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import Disclosure from "../components/Disclosure";
import P1P9Accordion from "../components/P1P9Accordion";

type P1P9Status = "ON_TRACK" | "NEEDS_ATTENTION" | "RISK";

type P1P9Item = {
  id: string; // "P1".."P9"
  label: string;
  summary: string;
  status: P1P9Status;
  coachNotes: string;
  commonMisses: string[];
  keyDrills: string[];
};

const DEFAULT_LABELS: Record<string, string> = {
  P1: "Setup",
  P2: "Shaft parallel backswing",
  P3: "Lead arm parallel backswing",
  P4: "Top of swing",
  P5: "Lead arm parallel downswing",
  P6: "Shaft parallel downswing",
  P7: "Impact",
  P8: "Trail arm parallel follow-through",
  P9: "Finish",
};

const DEFAULT_P1P9_ITEMS: P1P9Item[] = [
  {
    id: "P1",
    label: "Setup",
    summary: "Balanced, athletic posture with clean alignments.",
    status: "ON_TRACK",
    coachNotes: "Balanced, athletic posture with clean alignments.",
    commonMisses: ["Ball too far back", "Grip too weak/strong for pattern"],
    keyDrills: ["Mirror setup check", "Alignment stick for feet/hips/shoulders"],
  },
  {
    id: "P2",
    label: "Shaft parallel backswing",
    summary: "Clubhead tracks nicely with stable face control.",
    status: "ON_TRACK",
    coachNotes: "Clubhead tracks nicely along the target line with good face control.",
    commonMisses: ["Club rolling inside early", "Getting too steep by P2"],
    keyDrills: ["Low-and-slow takeaway", "Alignment rod on ground (hands/club path)"],
  },
  {
    id: "P3",
    label: "Lead arm parallel backswing",
    summary: "Good width and depth with solid coil potential.",
    status: "ON_TRACK",
    coachNotes: "Good width and depth with plenty of rotation and coil potential.",
    commonMisses: ["Lead arm collapses and loses width", "Trail leg locks early"],
    keyDrills: ["Wall drill (turn with space)", "Towel-under-arms connection"],
  },
  {
    id: "P4",
    label: "Top of swing",
    summary: "Playable top position with good structure.",
    status: "ON_TRACK",
    coachNotes: "Plenty of turn with a playable club position at the top.",
    commonMisses: ["Across-the-line when rushed", "Over-long backswing when tempo gets fast"],
    keyDrills: ["3-to-1 tempo rehearsal", "Pause-at-the-top swing"],
  },
  {
    id: "P5",
    label: "Lead arm parallel downswing",
    summary: "Club gets a touch steep under pressure - easy fix.",
    status: "NEEDS_ATTENTION",
    coachNotes: "Club is close to on-plane but can get just a touch steep under pressure.",
    commonMisses: ["Upper body dives toward ball", "Club drops too far outside hands"],
    keyDrills: ["Pump drill (rehearse shallow)", "Feet-together transition drill"],
  },
  {
    id: "P6",
    label: "Shaft parallel downswing",
    summary: "Face/path playable but can get slightly steep.",
    status: "NEEDS_ATTENTION",
    coachNotes: "Face and path are playable but a fraction steep can steal compression.",
    commonMisses: ["Handle gets too high at P6", "Trail shoulder drives down"],
    keyDrills: ["Headcover just outside ball line", "Split-hand rehearsal"],
  },
  {
    id: "P7",
    label: "Impact",
    summary: "Generally square with decent shaft lean and compression.",
    status: "ON_TRACK",
    coachNotes: "Clubface is generally square with decent shaft lean and compression.",
    commonMisses: ["Low-point drifts back", "Hanging back adds loft"],
    keyDrills: ["Divot-forward drill", "Impact tape + strike pattern"],
  },
  {
    id: "P8",
    label: "Trail arm parallel follow-through",
    summary: "Arms/body sync with a clean extension.",
    status: "ON_TRACK",
    coachNotes: "Arms and body are synced with a clean extension toward target.",
    commonMisses: ["Club exits too low/left when held on", "Arms outrace body"],
    keyDrills: ["Hold P8 for 2 seconds", "Throw-the-club (feel sequence)"],
  },
  {
    id: "P9",
    label: "Finish",
    summary: "Balanced full finish with chest to target.",
    status: "ON_TRACK",
    coachNotes: "Balanced, full finish with chest facing the target and weight left.",
    commonMisses: ["Falling toward toes/heels", "Stopping rotation early"],
    keyDrills: ["Hold finish 3-count", "Eyes-closed finish balance"],
  },
];

export default function ReportPage() {
  const router = useRouter();

  // Chosen upload preview into report via sessionStorage
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // MVP fake AI payload (from public/mvp-report.json)
  const [mvpReport, setMvpReport] = useState<any>(null);

  // 1) Pull previewUrl from sessionStorage
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      // Preferred: data URL base64
      const dataUrl = sessionStorage.getItem("vca_video_base64");
      if (dataUrl) {
        setPreviewUrl(dataUrl);
        return;
      }

      // Fallback: blob URL
      const blobUrl = sessionStorage.getItem("vca_previewUrl");
      if (blobUrl) setPreviewUrl(blobUrl);
    } catch {
      // ignore
    }
  }, []);

  // 2) Demo fallback so the report never looks empty
  useEffect(() => {
    if (!previewUrl) setPreviewUrl("/test_clip.mp4");
  }, [previewUrl]);

  // 3) Load stub report JSON (optional)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/mvp-report.json", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        setMvpReport(json);
      } catch {
        // ignore
      }
    })();
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
                {"<-"} Back to home
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

            {/* VIDEO WINDOW */}
            <section style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, opacity: 0.9 }}>SWING VIDEO</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Video window stays here. Wiring to upload next.</div>
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

              {previewUrl ? (
                <div
                  style={{
                    height: 360,
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "#000",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <video src={previewUrl} controls playsInline preload="metadata" style={{ width: "100%", height: "100%", display: "block" }} />
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
                      Upload a swing to preview it here. Next: replace this local preview with Mux playback and P1-P9 sync.
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75, lineHeight: 1.5 }}>
                This is where we will put the <strong>impact-centered, short, never-cuts-downswing</strong> clip (your north star).
              </div>
            </section>
          </div>

          {/* Collapsed section */}
          <div style={{ marginTop: 14 }}>
            <Disclosure
              title="P1-P9 Checkpoints"
              subtitle="Tap to expand. We'll keep details tucked away unless you ask."
              defaultOpen={false}
              persistKey="report_p1p9"
            >
              <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.6, marginBottom: 14 }}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>MVP AI Preview (stub)</div>

                {!mvpReport ? (
                  <div style={{ opacity: 0.75 }}>Loading stub report...</div>
                ) : (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <div>
                        <strong>Top faults:</strong>
                      </div>
                      <ul style={{ margin: "6px 0 0 0", paddingLeft: 18 }}>
                        {(mvpReport.topFaults ?? []).slice(0, 3).map((t: string, i: number) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div>
                        <strong>Priority drill:</strong> {mvpReport.priorityFix?.title ?? "—"}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <strong>How:</strong> {mvpReport.priorityFix?.how ?? "—"}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <strong>Why:</strong> {mvpReport.priorityFix?.why ?? "—"}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginTop: 10 }}>
                <P1P9Accordion
                  items={(mvpReport?.p1p9 ?? DEFAULT_P1P9_ITEMS).map((x: any) => ({
                    id: x.p ? `P${x.p}` : x.id,
                    label: x.label ?? DEFAULT_LABELS[x.p ? `P${x.p}` : x.id] ?? (x.p ? `P${x.p}` : x.id),
                    status: (x.status ?? x.state ?? "ON_TRACK").toUpperCase?.() ?? "ON_TRACK",
                    coachNotes: x.note ?? x.coachNotes ?? "",
                    commonMisses: x.commonMisses ?? [],
                    keyDrills: x.keyDrills ?? [],
                    summary: x.summary ?? "",
                  }))}
                  defaultMode="single"
                  showExpandAll
                />
              </div>
            </Disclosure>
          </div>
        </div>
      </main>
    </>
  );
}
