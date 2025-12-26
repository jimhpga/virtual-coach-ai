import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import BrandShell from "../components/BrandShell";

type AiPayload = {
  summary?: {
    intro?: string;
    diagnosis?: string;
    advice?: string;
    questions?: string[];
  };
  three_good?: string[];
  three_help?: string[];
  three_power_leaks?: string[];
  confidence?: { level?: "HIGH" | "MEDIUM" | "LOW"; reason?: string };
  camera_quality?: { status?: "PASS" | "WARN" | "FAIL"; reason?: string; tips?: string[] };
};

export default function ReportPage() {
  const router = useRouter();

  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [ai, setAi] = useState<AiPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string>("");

  // read video preview (optional)
  useEffect(() => {
    try {
      const v = sessionStorage.getItem("vca_preview_url") || "";
      if (v) setPreviewUrl(v);
    } catch {}
  }, []);

  const ctx = useMemo(() => {
    const q = router.query || {};
    return {
      name: String(q.name || "Player").trim(),
      club: String(q.club || "").trim(),
      hand: String(q.hand || q.handedness || "").trim(),
      eye: String(q.eye || "").trim(),
      notes: String(q.notes || "").trim(),
    };
  }, [router.query]);

  useEffect(() => {
    let cancelled = false;

    async function go() {
      if (!router.isReady) return;
      setLoading(true);
      setErr("");

      try {
        const res = await fetch("/api/ai-generate-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: ctx.notes,
            club: ctx.club,
            handedness: ctx.hand,
            eye: ctx.eye,
          }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || "AI request failed");
        }

        const json = await res.json();
        const data = (json?.data || json) as AiPayload;

        if (!cancelled) setAi(data);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Something went sideways calling AI.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    go();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, ctx.notes, ctx.club, ctx.hand, ctx.eye]);

  const shell: React.CSSProperties = {
    minHeight: "calc(100vh - 0px)",
    padding: 0,
  };

  const wrap: React.CSSProperties = {
    maxWidth: 1100,
    margin: "0 auto",
    padding: 24,
    color: "#fff",
  };

  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 16,
  };

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.28)",
    backdropFilter: "blur(10px)",
    padding: 16,
    boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
  };

  const h: React.CSSProperties = { fontWeight: 950, letterSpacing: 0.4, marginBottom: 8 };
  const small: React.CSSProperties = { fontSize: 12, opacity: 0.78, lineHeight: 1.5 };
  const pill = (bg: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: bg,
    fontSize: 12,
    fontWeight: 800,
  });

  const list = (items?: string[]) =>
    (items || []).slice(0, 3).map((t, i) => <li key={i}>{t}</li>);

  return (
    <>
      <Head>
        <title>Report | Virtual Coach AI</title>
      </Head>

      <BrandShell title="Swing Report">
        <main style={shell}>
          <div style={wrap}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.8, letterSpacing: 2 }}>VIRTUAL COACH AI</div>
                <div style={{ fontSize: 26, fontWeight: 1000, marginTop: 4 }}>
                  {ctx.name ? `${ctx.name}'s` : "Your"} Swing Report
                </div>
                <div style={small}>
                  {ctx.club ? `Club: ${ctx.club}` : "Club: (not specified)"}{" "}
                  {ctx.hand ? `• Hand: ${ctx.hand}` : ""} {ctx.eye ? `• Eye: ${ctx.eye}` : ""}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={pill("rgba(34,197,94,0.16)")}>
                  {ai?.confidence?.level ? `Confidence: ${ai.confidence.level}` : "Confidence: —"}
                </span>
                <span style={pill("rgba(59,130,246,0.14)")}>
                  {ai?.camera_quality?.status ? `Camera: ${ai.camera_quality.status}` : "Camera: —"}
                </span>
              </div>
            </div>

            <div style={grid}>
              {/* LEFT: AI SUMMARY */}
              <section style={card}>
                <div style={h}>AI Summary</div>

                {loading ? (
                  <div style={{ opacity: 0.8 }}>Generating your report…</div>
                ) : err ? (
                  <div style={{ opacity: 0.9 }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Couldn’t generate AI summary.</div>
                    <div style={small}>{err}</div>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Intro</div>
                      <div style={{ opacity: 0.9, lineHeight: 1.55 }}>{ai?.summary?.intro || "—"}</div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Diagnosis (best current read)</div>
                      <div style={{ opacity: 0.9, lineHeight: 1.55 }}>{ai?.summary?.diagnosis || "—"}</div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Advice (what to do next)</div>
                      <div style={{ opacity: 0.9, lineHeight: 1.55 }}>{ai?.summary?.advice || "—"}</div>
                    </div>

                    {ai?.confidence?.level === "LOW" && (ai?.summary?.questions || []).length ? (
                      <div style={{ marginTop: 10, padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)" }}>
                        <div style={{ fontWeight: 950, marginBottom: 6 }}>
                          Not confident yet — quick question(s):
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {(ai.summary?.questions || []).slice(0, 2).map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                        <div style={{ ...small, marginTop: 8 }}>
                          Rule: we don’t guess if it could make you worse. Answer these and we’ll tighten the diagnosis.
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </section>

              {/* RIGHT: 3 / 3 / 3 + CAMERA */}
              <section style={card}>
                <div style={h}>Quick Hits</div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Three things you do well</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>{list(ai?.three_good)}</ul>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Three things you need help with</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>{list(ai?.three_help)}</ul>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Three power leaks</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>{list(ai?.three_power_leaks)}</ul>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Camera quality</div>
                  <div style={small}>
                    {ai?.camera_quality?.reason || "—"}
                  </div>
                  {(ai?.camera_quality?.tips || []).length ? (
                    <ul style={{ margin: "8px 0 0 0", paddingLeft: 18 }}>
                      {(ai?.camera_quality?.tips || []).slice(0, 3).map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            </div>

            {/* VIDEO */}
            <section style={{ ...card, marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 950, opacity: 0.9 }}>Swing Video</div>
                  <div style={small}>If the camera angle is bad, we’ll ask for a re-shoot (no charge).</div>
                </div>
              </div>

              {previewUrl ? (
                <div style={{ height: 360, borderRadius: 16, overflow: "hidden", background: "#000", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <video src={previewUrl} controls playsInline preload="metadata" style={{ width: "100%", height: "100%", display: "block" }} />
                </div>
              ) : (
                <div style={{ opacity: 0.75 }}>No video loaded yet.</div>
              )}
            </section>
          </div>
        </main>
      </BrandShell>
    </>
  );
}



