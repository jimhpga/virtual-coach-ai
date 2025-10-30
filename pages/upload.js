import { useState } from "react";

export default function UploadPage() {
  const [level, setLevel] = useState("intermediate");
  const [miss, setMiss]   = useState("pull-hook");
  const [goal, setGoal]   = useState("stop bowling it left under pressure");

  return (
    <main style={{maxWidth: 720, margin: "40px auto", fontFamily:"system-ui, sans-serif"}}>
      <h1>Virtual Coach AI — Upload</h1>
      <p>(Demo input only — the real video upload can be wired later.)</p>

      <label>Level<br/>
        <input value={level} onChange={e=>setLevel(e.target.value)} />
      </label>
      <br/><br/>

      <label>Typical miss<br/>
        <input value={miss} onChange={e=>setMiss(e.target.value)} />
      </label>
      <br/><br/>

      <label>Goal<br/>
        <input value={goal} onChange={e=>setGoal(e.target.value)} style={{width:"100%"}} />
      </label>
      <br/><br/>

      <a
        href={`/report?level=${encodeURIComponent(level)}&miss=${encodeURIComponent(miss)}&goal=${encodeURIComponent(goal)}`}
        style={{display:"inline-block", padding:"10px 16px", border:"1px solid #222", borderRadius:8, textDecoration:"none"}}
      >
        Generate Coaching Card →
      </a>

      <p style={{marginTop:24}}><a href="/">Back home</a></p>
    </main>
  );
}
