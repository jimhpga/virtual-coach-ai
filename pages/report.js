import React, { useState } from "react";
import { generateCoachingCard } from "../lib/coachApi";

export default function ReportPage() {
  const [level, setLevel] = useState("intermediate");
  const [miss, setMiss]   = useState("pull-hook");
  const [goal, setGoal]   = useState("more control under pressure");
  const [out, setOut]     = useState(null);
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true); setErr(""); setOut(null);
    try {
      const data = await generateCoachingCard({ level, miss, goal });
      setOut(data);
    } catch (ex) {
      setErr(String(ex?.message || ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{maxWidth: 840, margin: "40px auto", padding: 16, fontFamily: "system-ui, sans-serif"}}>
      <h1>Generate Coaching Report</h1>
      <form onSubmit={onSubmit} style={{display: "grid", gap: 12, marginTop: 16}}>
        <label>
          Level
          <input value={level} onChange={e=>setLevel(e.target.value)} placeholder="beginner|intermediate|scratch" style={{width:"100%"}}/>
        </label>
        <label>
          Typical miss
          <input value={miss} onChange={e=>setMiss(e.target.value)} placeholder="pull-hook | high right | push" style={{width:"100%"}}/>
        </label>
        <label>
          Main goal
          <input value={goal} onChange={e=>setGoal(e.target.value)} placeholder="more control under pressure" style={{width:"100%"}}/>
        </label>
        <button disabled={busy} style={{padding: "10px 14px"}}>{busy ? "Working…" : "Generate"}</button>
      </form>

      {err && <p style={{color:"crimson", marginTop:16}}>{err}</p>}

      {out && (
        <section style={{marginTop: 24}}>
          <h2>Result</h2>
          <pre style={{whiteSpace:"pre-wrap", background:"#111", color:"#eee", padding:16, borderRadius:8}}>
{JSON.stringify(out, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
