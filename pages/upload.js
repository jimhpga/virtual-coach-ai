// pages/upload.js
// Simple placeholder for swing upload flow.
// Later we'll hook this to /save-report on Render.

export default function UploadPage() {
  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Upload Your Swing</h1>
        <p style={styles.p}>
          This is where you'll send a video + notes, and the system will build
          a swing report you can view/share.
        </p>

        <div style={styles.section}>
          <label style={styles.label}>Your Notes / What you’re working on</label>
          <textarea
            style={styles.textarea}
            placeholder="example: Driver misses left when I try to hit it hard..."
            rows={4}
          />
        </div>

        <div style={styles.section}>
          <label style={styles.label}>Video file (coming soon)</label>
          <input type="file" style={styles.input} disabled />
          <div style={styles.hint}>
            Video upload pipeline will go here. For now this is just UI.
          </div>
        </div>

        <button style={styles.button} disabled>
          Generate My Swing Report (coming soon)
        </button>

        <div style={styles.footerHint}>
          After upload, you’ll get a shareable /report link with your checkpoints (P1–P9),
          priorities, and a 14-day plan.
        </div>
      </div>
    </main>
  );
}

// inline styles to keep this file self-contained
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
    maxWidth: "480px",
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
    margin: "0 0 20px",
    lineHeight: "1.4",
    color: "#9bb4c9",
    fontSize: "14px",
  },
  section: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    marginBottom: "6px",
    color: "#fff",
  },
  textarea: {
    width: "100%",
    borderRadius: "8px",
    border: "1px solid #324b5d",
    backgroundColor: "#0b141a",
    color: "#fff",
    fontSize: "14px",
    padding: "10px",
    resize: "vertical",
  },
  input: {
    width: "100%",
    borderRadius: "8px",
    border: "1px solid #324b5d",
    backgroundColor: "#0b141a",
    color: "#667b8c",
    fontSize: "14px",
    padding: "10px",
  },
  hint: {
    marginTop: "6px",
    fontSize: "12px",
    color: "#667b8c",
    lineHeight: "1.4",
  },
  button: {
    width: "100%",
    backgroundColor: "#33b5ff",
    color: "#00131d",
    border: "0",
    fontWeight: 600,
    fontSize: "15px",
    padding: "12px",
    borderRadius: "10px",
    cursor: "not-allowed",
  },
  footerHint: {
    marginTop: "16px",
    fontSize: "12px",
    lineHeight: "1.4",
    color: "#9bb4c9",
    textAlign: "center",
  },
};
