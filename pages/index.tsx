import Head from "next/head";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function Home() {
  const bg = useMemo(() => "/golf-course-bg.jpg", []);

  const [eye, setEye] = useState("Right Eye");
  const [hand, setHand] = useState("Right-Handed");

  return (
    <>
      <Head>
        <title>Virtual Coach AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main
        style={{
          minHeight: "100vh",
          backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.55)), url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ width: "100%", maxWidth: 980, textAlign: "center", color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <img
              src="/virtualcoach-logo-transparent.png"
              alt="Virtual Coach AI"
              style={{ maxWidth: 520, width: "90%", height: "auto" }}
            />
          </div>

          <div style={{ opacity: 0.9, fontSize: 16, marginBottom: 8 }}>
            Welcome to the Beta Test of Virtual Coach AI
          </div>

          <h1 style={{ fontSize: 44, margin: "8px 0 18px 0", fontWeight: 800 }}>
            Virtual Coach AI
          </h1>

          <div
            style={{
              display: "inline-flex",
              gap: 14,
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 14,
              padding: "14px 16px",
              backdropFilter: "blur(6px)",
            }}
          >
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 14, opacity: 0.9 }}>Eye Dominance:</span>
              <select
                value={eye}
                onChange={(e) => setEye(e.target.value)}
                style={{
                  height: 34,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.35)",
                  background: "rgba(255,255,255,0.92)",
                  padding: "0 10px",
                }}
              >
                <option>Right Eye</option>
                <option>Left Eye</option>
                <option>Not Sure</option>
              </select>
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 14, opacity: 0.9 }}>Handedness:</span>
              <select
                value={hand}
                onChange={(e) => setHand(e.target.value)}
                style={{
                  height: 34,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.35)",
                  background: "rgba(255,255,255,0.92)",
                  padding: "0 10px",
                }}
              >
                <option>Right-Handed</option>
                <option>Left-Handed</option>
              </select>
            </label>

            <Link
              href={{ pathname: "/upload", query: { eye, hand } }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 40,
                padding: "0 18px",
                borderRadius: 10,
                background: "#22c55e",
                color: "#06210f",
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: "0 10px 22px rgba(0,0,0,0.35)",
              }}
            >
              Upload Your Swing
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}