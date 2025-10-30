// pages/demo-report.js
import React, { useState } from "react";
import { generateCoachingCard } from "../lib/coachApi";

export default function DemoReportPage() {
  const [level, setLevel] = useState("intermediate");
  const [miss, setMiss] = useState("pull-hook");
  const [goal, setGoal] = useState("stop bowling it left under pressure");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleGenerate(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setResult(null);

    try {
      const data = await generateCoachingCard({ level, miss, goal });
      setResult(data);
    } catch (err) {
      setErrorMsg(
        "Could not reach backend. Check NEXT_PUBLIC_API_BASE in .env.local"
      );
    } finally {
      setLoading(false);
    }
  }

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
          maxWidth: "800px",
          margin: "0 auto",
          lineHeight: 1.4,
        }}
      >
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "#fff",
            marginBottom: "0.5rem",
          }}
        >
          Generate Your Coaching Card
        </h1>

        <p
          style={{
            color: "#8ea0ac",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          This talks to the backend at{" "}
          <code
            style={{
              background: "#1a1a1a",
              padding: "0.15rem 0.4rem",
              borderRadius: "4px",
              fontSize: "0.8rem",
              color: "#9aa7bd",
            }}
          >
            {process.env.NEXT_PUBLIC_API_BASE || "(unset)"}/generate-report
          </code>
          . You’ll get Top 2 Fixes + Power Note + Day-One Drill.
        </p>

        {/* form card */}
        <form
          onSubmit={handleGenerate}
          style={{
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "0.5rem",
            padding: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                color: "#fff",
                fontSize: "0.8rem",
                fontWeight: 500,
                marginBottom: "0.25rem",
              }}
            >
              Player level
            </label>
            <input
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "#1f2937",
                color: "#fff",
                border: "1px solid #4b5563",
                borderRadius: "4px",
                padding: "0.5rem",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                color: "#fff",
                fontSize: "0.8rem",
                fontWeight: 500,
                marginBottom: "0.25rem",
              }}
            >
              Typical miss
            </label>
            <input
              value={miss}
              onChange={(e) => setMiss(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "#1f2937",
                color: "#fff",
                border: "1px solid #4b5563",
                borderRadius: "4px",
                padding: "0.5rem",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                color: "#fff",
                fontSize: "0.8rem",
                fontWeight: 500,
                marginBottom: "0.25rem",
              }}
            >
              Main goal
            </label>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "#1f2937",
                color: "#fff",
                border: "1px solid #4b5563",
                borderRadius: "4px",
                padding: "0.5rem",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? "#374151" : "#10b981",
              color: "#000",
              fontWeight: 600,
              border: "none",
              borderRadius: "4px",
              padding: "0.6rem 1rem",
              fontSize: "0.9rem",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating..." : "Generate Coaching Card"}
          </button>
        </form>

        {/* error block */}
        {errorMsg && (
          <div
            style={{
              backgroundColor: "#4b1d1d",
              border: "1px solid #b91c1c",
              color: "#fff",
              fontSize: "0.8rem",
              borderRadius: "0.5rem",
              padding: "1rem",
              marginBottom: "2rem",
              whiteSpace: "pre-wrap",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* result block */}
        {result && (
          <div
            style={{
              backgroundColor: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "0.5rem",
              padding: "1rem",
              marginBottom: "2rem",
              whiteSpace: "pre-wrap",
              fontSize: "0.8rem",
              lineHeight: 1.5,
              color: "#f8fafc",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.9rem",
                marginBottom: "0.5rem",
                color: "#fff",
              }}
            >
              Coaching Card
            </div>
            {result.summary ? result.summary : "(no summary returned)"}

            <div
              style={{
                marginTop: "1rem",
                fontSize: "0.7rem",
                color: "#64748b",
              }}
            >
              <div>Model used: {result?.meta?.model_used || "?"}</div>
              <div>Level: {result?.meta?.level || level}</div>
              <div>Miss: {result?.meta?.miss || miss}</div>
              <div>Goal: {result?.meta?.goal || goal}</div>
            </div>
          </div>
        )}

        <a
          href="/"
          style={{
            display: "inline-block",
            color: "#10b981",
            fontSize: "0.8rem",
            textDecoration: "none",
            borderBottom: "1px solid #10b981",
          }}
        >
          ← Back home
        </a>
      </div>
    </div>
  );
}
