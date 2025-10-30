// pages/index.js
import React from "react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000",
        color: "#fff",
        fontFamily:
          "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: "640px",
          margin: "0 auto",
          lineHeight: 1.4,
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            color: "#fff",
            marginBottom: "0.5rem",
          }}
        >
          Virtual Coach AI
        </h1>

        <p
          style={{
            color: "#8ea0ac",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          Your on-demand swing coach. Clarity &gt; tips. Pressure-proof &gt;
          pretty.
        </p>

        <div
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
          <Link
            href="/demo-report"
            style={{
              display: "block",
              backgroundColor: "#133a2b",
              padding: "1rem",
              borderRadius: "0.5rem",
              textDecoration: "none",
              border: "1px solid #2a5d47",
            }}
          >
            <div
              style={{
                color: "#fff",
                fontWeight: 600,
                fontSize: "1rem",
                marginBottom: "0.25rem",
              }}
            >
              Generate Coaching Card →
            </div>
            <div style={{ color: "#8ea0ac", fontSize: "0.8rem" }}>
              Tell me your miss and your goal. I’ll build your Top 2 Fixes +
              Day-One Drill.
            </div>
          </Link>

          <a
            href="https://virtual-coach-ai-api.onrender.com/generate-report"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              backgroundColor: "#1a1a1a",
              padding: "1rem",
              borderRadius: "0.5rem",
              textDecoration: "none",
              border: "1px solid #333",
            }}
          >
            <div
              style={{
                color: "#fff",
                fontWeight: 600,
                fontSize: "1rem",
                marginBottom: "0.25rem",
              }}
            >
              API health check →
            </div>
            <div style={{ color: "#8ea0ac", fontSize: "0.8rem" }}>
              Opens the backend service we deployed on Render (no data sent).
            </div>
          </a>

          <Link
            href="/upload"
            style={{
              display: "block",
              backgroundColor: "#1f2538",
              padding: "1rem",
              borderRadius: "0.5rem",
              textDecoration: "none",
              border: "1px solid #3a4466",
            }}
          >
            <div
              style={{
                color: "#fff",
                fontWeight: 600,
                fontSize: "1rem",
                marginBottom: "0.25rem",
              }}
            >
              Upload Swing Video (beta)
            </div>
            <div style={{ color: "#8ea0ac", fontSize: "0.8rem" }}>
              Send face-on or down-the-line. We’ll attach it to your report.
              (WIP)
            </div>
          </Link>

          <Link
            href="/report"
            style={{
              display: "block",
              backgroundColor: "#2d1f2f",
              padding: "1rem",
              borderRadius: "0.5rem",
              textDecoration: "none",
              border: "1px solid #5a3a66",
            }}
          >
            <div
              style={{
                color: "#fff",
                fontWeight: 600,
                fontSize: "1rem",
                marginBottom: "0.25rem",
              }}
            >
              View Saved Report (beta)
            </div>
            <div style={{ color: "#8ea0ac", fontSize: "0.8rem" }}>
              Pulls your latest 14-day plan, checkpoints, and power notes. (WIP)
            </div>
          </Link>
        </div>

        <div
          style={{
            color: "#444",
            fontSize: "0.7rem",
            marginTop: "3rem",
            borderTop: "1px solid #222",
            paddingTop: "1rem",
          }}
        >
          <div>alpha build • local dev</div>
          <div>frontend → http://localhost:3001</div>
          <div>api → https://virtual-coach-ai-api.onrender.com</div>
        </div>
      </div>
    </div>
  );
}
