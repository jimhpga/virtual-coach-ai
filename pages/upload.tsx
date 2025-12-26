import Head from "next/head";
import BrandShell from "../components/BrandShell";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";

type SpeechRecognitionType = any;

export default function UploadPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [eye, setEye] = useState("Right Eye");
  const [hand, setHand] = useState("Right-Handed");
  const [club, setClub] = useState("Driver");

  const [notes, setNotes] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  const canSpeech = useMemo(() => {
    if (typeof window === "undefined") return false;
    const w: any = window as any;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  // Build video preview when user picks a file
  useEffect(() => {
    try {
      if (!file) {
        setPreviewUrl(null);
        return;
      }
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } catch {
      setPreviewUrl(null);
    }
  }, [file]);

  // Speech Recognition wiring (no installs)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!canSpeech) return;

    const w: any = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: any) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const t = r[0]?.transcript || "";
        if (r.isFinal) finalText += t;
      }
      if (finalText.trim()) {
        setNotes((prev) => (prev ? prev + " " : "") + finalText.trim());
      }
    };

    rec.onerror = (e: any) => {
      setSpeechError(e?.error ? String(e.error) : "Speech recognition error");
      setIsListening(false);
      try { rec.stop(); } catch {}
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSpeech]);

  const toggleMic = () => {
    setSpeechError(null);
    if (!canSpeech) {
      setSpeechError("Speech input isn't supported in this browser.");
      return;
    }
    const rec = recognitionRef.current;
    if (!rec) return;

    try {
      if (!isListening) {
        setIsListening(true);
        rec.start();
      } else {
        setIsListening(false);
        rec.stop();
      }
    } catch (e: any) {
      setSpeechError(e?.message ? String(e.message) : "Could not start mic.");
      setIsListening(false);
    }
  };

  // Store base64 in sessionStorage so report page can show preview across navigation
  const stashVideoAsBase64 = async (f: File) => {
    const toDataURL = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.readAsDataURL(file);
      });

    const dataUrl = await toDataURL(f);
    try {
      sessionStorage.setItem("vca_video_base64", dataUrl);
      // Keep a fallback to the local blob URL if you ever used it elsewhere
      if (previewUrl) sessionStorage.setItem("vca_previewUrl", previewUrl);
    } catch {}
  };

  const onContinue = async () => {
    // Notes are optional. Name optional. Everything optional. (MVP rules)
    try {
      if (file) await stashVideoAsBase64(file);
    } catch {}

    router.push({
      pathname: "/report",
      query: {
        name: (name || "Player").trim(),
        eye,
        hand,
        club,
        notes: notes.trim(),
      },
    });
  };

  const shell: React.CSSProperties = {
    minHeight: "calc(100vh - 0px)",
    padding: 0,
  };

  const card: React.CSSProperties = {
    maxWidth: 980,
    margin: "0 auto",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    backdropFilter: "blur(10px)",
  };

  const label: React.CSSProperties = { fontSize: 12, opacity: 0.8, marginBottom: 6, fontWeight: 800 };
  const input: React.CSSProperties = {
    width: "100%",
    height: 42,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "#e6edf6",
    padding: "0 12px",
    outline: "none",
  };

  const textarea: React.CSSProperties = {
    width: "100%",
    minHeight: 120,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "#e6edf6",
    padding: 12,
    outline: "none",
    lineHeight: 1.5,
    resize: "vertical",
  };

  const btn: React.CSSProperties = {
    height: 44,
    padding: "0 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "#e6edf6",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    cursor: "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };

  const primary: React.CSSProperties = {
    ...btn,
    borderColor: "rgba(34,197,94,0.40)",
    background: "rgba(34,197,94,0.16)",
  };

  const micBtn: React.CSSProperties = {
    ...btn,
    borderColor: isListening ? "rgba(239,68,68,0.45)" : "rgba(255,255,255,0.12)",
    background: isListening ? "rgba(239,68,68,0.14)" : "rgba(0,0,0,0.22)",
  };

  return (
    <>
      <Head>
        <title>Upload | Virtual Coach AI</title>
      </Head>

      <BrandShell title="Upload">
        <main style={shell}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 1000 }}>Upload your swing</div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                  Tip: short clip from setup to finish. We’ll eventually auto-cut the impact-centered “north star” clip.
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 14 }}>
              <div>
                <div style={label}>Name (optional)</div>
                <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Player" />
              </div>
              <div>
                <div style={label}>Eye</div>
                <select style={input as any} value={eye} onChange={(e) => setEye(e.target.value)}>
                  <option>Right Eye</option>
                  <option>Left Eye</option>
                  <option>Not sure</option>
                </select>
              </div>
              <div>
                <div style={label}>Handedness</div>
                <select style={input as any} value={hand} onChange={(e) => setHand(e.target.value)}>
                  <option>Right-Handed</option>
                  <option>Left-Handed</option>
                </select>
              </div>
              <div>
                <div style={label}>Club</div>
                <select style={input as any} value={club} onChange={(e) => setClub(e.target.value)}>
                  <option>Driver</option>
                  <option>3W</option>
                  <option>Hybrid</option>
                  <option>Iron</option>
                  <option>Wedge</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={label}>What are you working on? (optional)</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    Example: left wrist, knee flex, left arm bend, over-the-top, hook/slice, contact.
                  </div>
                </div>

                <button type="button" style={micBtn} onClick={toggleMic} title={canSpeech ? "Tap to dictate" : "Speech not supported"}>
                  {isListening ? "● Listening…" : "🎤 Talk"}
                </button>
              </div>

              <textarea
                style={textarea}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type here… or tap Talk and say it out loud."
              />

              {speechError ? (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                  ⚠ {speechError}
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: 14, padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>Swing video</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    MP4/MOV recommended.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" style={btn} onClick={() => fileInputRef.current?.click()}>
                    Choose video
                  </button>
                  <button type="button" style={primary} onClick={onContinue}>
                    Continue to report
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                }}
              />

              <div style={{ marginTop: 12 }}>
                {previewUrl ? (
                  <div style={{ height: 320, borderRadius: 16, overflow: "hidden", background: "#000", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <video src={previewUrl} controls playsInline preload="metadata" style={{ width: "100%", height: "100%", display: "block" }} />
                  </div>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.75, padding: 12 }}>
                    No video selected yet.
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
              MVP rule: if we’re not confident, we say so and ask a question — we don’t guess and make the player worse.
            </div>
          </div>
        </main>
      </BrandShell>
    </>
  );
}
