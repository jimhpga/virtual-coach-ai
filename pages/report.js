// pages/report.js
import { useState } from "react";
import { generateCoachingCard } from "../lib/coachApi";

export default function Report() {
  const [level, setLevel] = useState("intermediate");
  const [miss, setMiss]   = useState("pull-hook");
  const [goal, setGoal]   = useState("stop bowling it left under pressure");
  const [out, setOut]     = useState(null);
  const [err, setErr]     = useState("");

  async function run() {
    setErr(""); setOut(null);
    try {
      const data = await generateCoachingCard({ level, miss, goal });
      setOut(data);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  return (
    <main style={{padding:20,fontFamily:"system-ui",maxWidth:800}}>
      <h1>Coaching Card Demo</h1>
      <div style={{display:"grid",gap:8,maxWidth:600}}>
        <label>Level <input value={level} onChange={e=>setLevel(e.target.value)} /></label>
        <label>Miss  <input value={miss}  onChange={e=>setMiss(e.target.value)} /></label>
        <label>Goal  <input value={goal}  onChange={e=>setGoal(e.target.value)} /></label>
        <button onClick={run} style={{padding:"8px 12px"}}>Generate</button>
      </div>

      {err && <pre style={{color:"crimson",whiteSpace:"pre-wrap"}}>{err}</pre>}
      {out && (
        <section style={{marginTop:20}}>
          <h2>Result</h2>
          <pre style={{whiteSpace:"pre-wrap"}}>{out.summary || JSON.stringify(out,null,2)}</pre>
        </section>
      )}
    </main>
  );
}

