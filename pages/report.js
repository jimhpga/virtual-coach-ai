import { useEffect, useState } from "react";
import { generateCoachingCard } from "../lib/coachApi";

export default function ReportPage() {
  const [summary, setSummary] = useState("Loading…");
  const [meta, setMeta] = useState({});
  const [warning, setWarning] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const level = url.searchParams.get("level") || "intermediate";
    const miss  = url.searchParams.get("miss")  || "pull-hook";
    const goal  = url.searchParams.get("goal")  || "more control under pressure";

    (async () => {
      const data = await generateCoachingCard({ level, miss, goal });
      setSummary(data.summary || "No summary returned.");
      setMeta(data.meta || {});
      if (data.warning) setWarning(String(data.warning));
    })();
  }, []);

  return (
    <main style={{maxWidth: 800, margin: "40px auto", fontFamily:"system-ui, sans-serif"}}>
      <h1>Virtual Coach AI — Coaching Card</h1>
      {warning && <p style={{color:"#b36"}}>Note: {warning}</p>}
      <pre style={{whiteSpace:"pre-wrap", background:"#f7f7f7", padding:16, borderRadius:8}}>
{summary}
      </pre>
      <div style={{marginTop:16, fontSize:14, color:"#555"}}>
        <div><strong>Level:</strong> {meta.level || "?"}</div>
        <div><strong>Miss:</strong> {meta.miss || "?"}</div>
        <div><strong>Goal:</strong> {meta.goal || "?"}</div>
      </div>

      <p style={{marginTop:24}}><a href="/upload">← Back to Upload</a></p>
      <p><a href="/">← Home</a></p>
    </main>
  );
}
