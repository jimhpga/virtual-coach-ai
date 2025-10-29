// pages/report.js
// Minimal "viewer" for a saved swing report JSON blob.
// Right now this just fetches any JSON URL you paste.

import { useState } from "react";

export default function ReportViewerPage() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [report, setReport] = useState(null);

  async function handleLoad() {
    try {
      setStatus("Loading...");
      const resp = await fetch(url);
      const data = await resp.json();
      setReport(data);
      setStatus("Loaded.");
    } catch (err) {
      setStatus("Failed to load that URL.");
      setReport(null);
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.h1}>View Swing Report</h1>
        <p style={styles.p}>
          Paste a report.json URL (from the cloud) and load it.
          You’ll get checkpoints (P1–P9), priority fixes, 14-day plan, etc.
        </p>

        <div style={styles.row}>
          <input
            style={styles.input}
            placeholder="https://.../report.json"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button style={styles.button} onClick={handleLoad}>
            Load
          </button>
        </div>

        <div style={styles.status}>{status}</div>

        <div style={styles.scrollBox}>
          <pre style={styles.pre}>
            {report ? JSON.stringify(report, null, 2) : "// no report loaded"}
          </pre>
        </div>
      </div>
    </main>
  );
}

const styles = {
  main: {
    minHeight: "100vh",
    backgroundColor: "#0a1117",
    color: "#fff",
    padding: "32px",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    display: "flex",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: "700px",
    backgroundColor: "#0f1b22",
    border: "1px solid #22313d",
    borderRadius: "16px",
    padding: "24px",
  },
  h1: {
    margin: "0 0 8px",
    fontSize: "20px",
    fontWeight: 600,
    color: "#fff",
  },
  p: {
    margin: "0 0 16px",
    fontSize: "14px",
    lineHeight: "1.4",
    color: "#9bb4c9",
  },
  row: {
    display: "flex",
    gap: "8px",
    marginBottom: "12px",
  },
  input: {
    flex: 1,
    borderRadius: "8px",
    border: "1px solid #324b5d",
    backgroundColor: "#0b141a",
    color: "#fff",
    fontSize: "14px",
    padding: "10px",
  },
  button: {
    backgroundColor: "#33b5ff",
    color: "#00131d",
    border: "0",
    fontWeight: 600,
    fontSize: "14px",
    padding: "10px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  status: {
    fontSize: "12px",
    lineHeight: "1.4",
    color: "#9bb4c9",
    marginBottom: "12px",
    minHeight: "16px",
  },
  scrollBox: {
    maxHeight: "320px",
    overflowY: "auto",
    backgroundColor: "#0b141a",
    borderRadius: "8px",
    border: "1px solid #324b5d",
    padding: "12px",
  },
  pre: {
    fontSize: "12px",
    lineHeight: "1.4",
    color: "#cfe8ff",
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
};
