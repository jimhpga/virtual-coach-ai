// app/upload/page.tsx
"use client";

import { useRef, useState } from "react";

type CreateMuxUploadResp = {
  id: string;
  url: string; // pre-signed upload URL for a single PUT
};

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [doneId, setDoneId] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    try {
      if (!file) return;
      setStatus("Requesting upload URL…");

      // 1) Ask our API to create a Direct Upload (MUX) or S3 presigned URL (fallback)
      const res = await fetch("/api/upload", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data: { provider: "mux" | "s3"; url: string; id: string } = await res.json();

      // 2) Stream the file with progress
      setStatus(`Uploading to ${data.provider.toUpperCase()}…`);

      // fetch PUT doesn’t expose progress; use XHR for a simple, reliable progress bar
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", data.url, true);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.statusText)));
        xhr.onerror = () => reject(new Error("Network error"));
        // Set required headers for MUX; S3 tolerates it
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });

      setStatus("Upload complete. Processing…");
      setDoneId(data.id);

      // 3) Kick to the report shell (it will poll/refresh later when asset is ready)
      window.location.href = `/report?id=${encodeURIComponent(data.id)}&provider=${data.provider}`;
    } catch (err: any) {
      setStatus(`Error: ${err.message || String(err)}`);
    }
  }

  return (
    <section>
      <h1 className="h-lg">Upload Your Swing</h1>
      <p className="k">Down-the-line 240–480p is perfect. Keep the club in frame.</p>

      <div style={{marginTop:16, display:"grid", gap:12, maxWidth:560}}>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          capture="environment"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          className="btn"
          disabled={!file}
          onClick={handleUpload}
          style={{opacity: file ? 1 : 0.5, width:180}}
        >
          Upload
        </button>

        {!!progress && progress < 100 && (
          <div style={{height:10, background:"#222", borderRadius:6, overflow:"hidden"}}>
            <div style={{height:"100%", width:`${progress}%`, background:"#10b981"}} />
          </div>
        )}

        <div className="k">{status}</div>
        {doneId && <div className="k">ID: {doneId}</div>}
      </div>
    </section>
  );
}
