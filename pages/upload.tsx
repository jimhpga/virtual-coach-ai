import Head from "next/head";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";

export default function UploadPage() {
  const router = useRouter();
  const bg = useMemo(() => "/homepage-background.png", []);

  const eye = (router.query.eye as string) || "Right Eye";
  const hand = (router.query.hand as string) || "Right-Handed";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [club, setClub] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <>
      <Head>
        <title>Upload Swing - Virtual Coach AI</title>
      </Head>

      <main
        style={{
          minHeight: "100vh",
          backgroundImage: `linear-gradient(rgba(0,0,0,0.22), rgba(0,0,0,0.55)), url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
        }}
      >
        <div style={{ width: "100%", maxWidth: 900 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <img
              src="/virtualcoach-logo-transparent.png"
              alt="Virtual Coach AI"
              style={{ maxWidth: 420, width: "90%" }}
            />
          </div>

          <h1 style={{ textAlign: "center", margin: "0 0 16px 0" }}>Upload Your Swing</h1>

          <div
            style={{
              margin: "0 auto",
              maxWidth: 760,
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 16,
              padding: 18,
              backdropFilter: "blur(6px)",
            }}
          >
            <div style={{ opacity: 0.9, marginBottom: 10, textAlign: "center" }}>
              Eye: <strong>{eye}</strong> | Handedness: <strong>{hand}</strong>
            </div>

            <div
              style={{
                border: "2px dashed rgba(255,255,255,0.28)",
                borderRadius: 14,
                padding: 18,
                textAlign: "center",
                marginBottom: 14,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>
                Click to browse or drag and drop a video file
              </div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>
                MP4 / MOV recommended | ideally 1-3 seconds from setup to finish
              </div>

              <input type="file" accept="video/*" style={{ marginTop: 12 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                style={inputStyle}
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email for report"
                style={inputStyle}
              />
              <input
                value={club}
                onChange={(e) => setClub(e.target.value)}
                placeholder="Club used (optional)"
                style={inputStyle}
              />
              <input value={hand} readOnly placeholder="Handedness" style={{ ...inputStyle, opacity: 0.85 }} />
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything specific you want us to look at?"
              style={{
                ...inputStyle,
                marginTop: 12,
                height: 90,
                resize: "vertical",
                paddingTop: 10,
              }}
            />

            <button
              type="button"
              style={{
                marginTop: 14,
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "none",
                background: "#22c55e",
                color: "#06210f",
                fontWeight: 900,
                cursor: "pointer",
              }}
              onClick={() => alert("Next step: wire this button back to your upload flow")}
            >
              Upload & analyze swing
            </button>

            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 10, textAlign: "center" }}>
              Pilot phase: we'll process your swing and email you a link. No spam, no sharing.
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(255,255,255,0.92)",
  padding: "0 12px",
  outline: "none",
  color: "#111",
};
