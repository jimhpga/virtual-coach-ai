import React from "react";
import Link from "next/link";

export default function UploadPage() {
  return (
    <main style={{maxWidth: 720, margin: "40px auto", padding: 16, fontFamily: "system-ui, sans-serif"}}>
      <h1>Upload Swing</h1>
      <p>
        This is a placeholder upload page. For MVP we’re only showing the demo “Generate Coaching Card”
        flow. Use the Report page to generate a coaching card from your inputs.
      </p>

      <ul style={{lineHeight: 1.7}}>
        <li>Step 1: Go to <Link href="/report">Report</Link> and fill the form.</li>
        <li>Step 2: We’ll wire video upload (Mux/Blob) back in later.</li>
      </ul>

      <p style={{marginTop: 32}}>
        Need a quick link? <Link href="/">Home</Link> · <Link href="/demo-report">Demo Report</Link>
      </p>
    </main>
  );
}
