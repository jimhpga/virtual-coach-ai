// api/analyze-stub.js
export const config = { runtime: "edge" }; // fast, no node deps

// simple deterministic hash from a string
function hash32(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function pick(arr, seed, salt=0) { return arr[(seed + salt) % arr.length]; }
function clamp01(x){ return Math.max(0, Math.min(1, x)); }

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405 });
  }

  try {
    const body = await req.json(); // { filename, height, meta:{name,email,...} }
    const basis = String(body?.filename || JSON.stringify(body) || "report");
    const h = hash32(basis);

    // vary power
    const powerScore = Math.round(50 + 50*clamp01(((h % 100) - 20)/70));     // 30–100
    const release    = Math.round(40 + 60*clamp01(((h>>3)%100)/100));        // 40–100
    const tempos     = ["2.5:1","2.8:1","3:1","3.2:1","3.5:1"];
    const tempo      = pick(tempos, h>>5);

    // vary P1–P9
    const phases = [
      { id:"P1", name:"Address", short: pick([
        "Athletic, neutral grip",
        "Posture a touch tall",
        "Ball too far forward"], h, 1) },
      { id:"P2", name:"Takeaway", short: pick([
        "One-piece takeaway",
        "Clubhead rolls inside",
        "Hands move out early"], h, 2) },
      { id:"P3", name:"Lead arm parallel", short: pick([
        "Great width",
        "Lead arm collapses slightly",
        "Club a bit across"], h, 3) },
      { id:"P4", name:"Top", short: pick([
        "Club parallel, face square",
        "Across the line",
        "Laid off slightly"], h, 4) },
      { id:"P5", name:"Lead arm parallel (down)", short: pick([
        "Club shallow, good",
        "Steep into the ball",
        "Trail elbow behind"], h, 5) },
      { id:"P6", name:"Club parallel (down)", short: pick([
        "On plane, matched face",
        "Club outside hands",
        "Face slightly open"], h, 6) },
      { id:"P7", name:"Impact", short: pick([
        "Handle forward, ball first",
        "Flip at the ball",
        "Great compression"], h, 7) },
      { id:"P8", name:"Post impact", short: pick([
        "Exit left, chest up",
        "Club exits high",
        "Arms stall"], h, 8) },
      { id:"P9", name:"Finish", short: pick([
        "Balanced, stacked",
        "Falls back a little",
        "Strong hold"], h, 9) },
    ].map(p => ({
      ...p,
      grade: pick(["ok","good","needs help"], h, p.id.charCodeAt(1)),
      long: `${p.name}: ${p.short}.`
    }));

    // vary fixes
    const priorityFixes = [
      "Posture at address (soft knees, tilt from hips)",
      "One-piece takeaway (match club-face to spine)",
      "Width to the top (avoid across-the-line)",
      "Shallow earlier (trail elbow in front)",
      "Handle forward at impact",
    ];
    const powerFixes = [
      "Use ground forces (post into lead side)",
      "Speed windows: light-med-full",
      "Tempo ladder (2.5 → 3.2:1)",
      "Longer arc without adding tension",
    ];
    const picks = (arr, n, salt=0) =>
      [...Array(n)].map((_,i)=> pick(arr, (h>>i)+salt, i));

    const plan = Array.from({length:14}, (_,i)=>({
      day: i+1,
      title: pick([
        "Mirror P1–P2",
        "Tempo ladder",
        "Lead wrist set",
        "Low-point gates",
        "Path & start line",
        "Speed windows",
        "Review & record",
      ], (h>>i), i),
      items: picks([
        "Athletic posture checkpoints",
        "Metronome 3:1 — 5 min",
        "Pump-step drill — 10 reps",
        "Bow lead wrist at top — 15 reps",
        "Impact line — 20 brush strikes",
        "Align stick start line — 15 balls",
        "Light–med–full — 15 balls",
        "Film 3 swings and review",
      ], 2, i)
    }));

    const out = {
      status: "ready",
      swingScore: powerScore,
      p1p9: phases,
      priorityFixes: picks(priorityFixes, 3, 123),
      powerFixes: picks(powerFixes, 3, 321),
      power: { score: powerScore, tempo, release_timing: release },
      practice_plan: plan
    };

    return new Response(JSON.stringify(out), {
      headers: { "content-type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message||e) }), { status: 500 });
  }
}
