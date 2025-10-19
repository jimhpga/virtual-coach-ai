// api/analyze-stub.js
export const config = { runtime: "edge" }; // fast, cheap

// -------- small helpers --------
function hash32(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function pick(arr, seed, salt = 0) {
  return arr[(seed + salt) % arr.length];
}
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function pct(n) { return Math.max(0, Math.min(100, Math.round(n))); }

// rank helpers
function topNByScore(items, n = 3, key = "score", desc = true) {
  return [...items].sort((a, b) =>
    desc ? (b[key] - a[key]) : (a[key] - b[key])
  ).slice(0, n);
}

// -------- main handler --------
export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405 });
  }

  try {
    const body = await req.json(); // { filename, height, meta }
    const basis = String(body?.filename || JSON.stringify(body) || "report");
    const h = hash32(basis);

    // Core scalars
    const powerScore = pct(55 + 45 * clamp01(((h % 100) - 10) / 90)); // 45–100 range-ish
    const release = pct(35 + 65 * clamp01(((h >> 3) % 100) / 100));   // 35–100
    const tempos = ["2.6:1", "2.8:1", "3:1", "3.2:1", "3.4:1"];
    const tempo = pick(tempos, h >> 5);

    // Phase share-text libraries
    const shortLib = {
      P1: ["Athletic, neutral grip", "Posture slightly tall", "Ball too far forward", "Great alignment", "Trail foot flared nicely"],
      P2: ["One-piece takeaway", "Clubhead rolls inside", "Hands move out early", "Face matches spine", "Slight wrist set early"],
      P3: ["Great width", "Lead arm collapses", "Club a bit across", "Shallowing early", "Clubface square"],
      P4: ["Club parallel, face square", "Across the line", "Laid off slightly", "Good trail wrist set", "Full turn to the top"],
      P5: ["Club shallow, good", "Steep into the ball", "Trail elbow behind", "Hands in front of chest", "Club in delivery window"],
      P6: ["On plane, matched face", "Club outside hands", "Face slightly open", "Exit around body", "Great shaft lean trend"],
      P7: ["Handle forward, ball first", "Flip at the ball", "Great compression", "Low-point ahead", "Open face at impact"],
      P8: ["Exit left, chest up", "Club exits high", "Arms stall", "Re-centers on lead side", "Face closure consistent"],
      P9: ["Balanced, stacked", "Falls back a little", "Strong hold", "Finish around body", "Full rotation"]
    };
    const longLib = {
      P1: "At address, check posture, grip, ball position and alignment. You want an athletic setup with slight knee flex and tilt from the hips.",
      P2: "During the takeaway (P2), keep the triangle intact and match the clubface to spine angle.",
      P3: "By lead-arm-parallel (P3), maintain width and let the club start to shallow slightly.",
      P4: "At the top (P4), a full turn with a square face promotes a repeatable downswing.",
      P5: "On the way down (P5), shallow the shaft early with the trail elbow moving in front of the hip.",
      P6: "At P6, the club should be parallel to the ground with the shaft slightly behind the hands.",
      P7: "At impact (P7) aim for handle forward, ball-first contact and low-point ahead of the ball.",
      P8: "Post-impact (P8) you’ll see the club exiting left with body rotation continuing.",
      P9: "Finish (P9) balanced and stacked over the lead side with the chest facing target."
    };

    // Grades and penalties per phase (for deriving top fixes)
    const grades = ["good", "ok", "needs help"];
    const phases = ["P1","P2","P3","P4","P5","P6","P7","P8","P9"].map((pid, i) => {
      const name = [
        "Address","Takeaway","Lead arm parallel","Top",
        "Lead arm parallel (down)","Club parallel (down)",
        "Impact","Post impact","Finish"
      ][i];
      const short = pick(shortLib[pid], h >> (i+1), i);
      const grade = pick(grades, h >> (i+2), i*7);
      const penalty = grade === "needs help" ? 2 : grade === "ok" ? 1 : 0; // derive fix importance
      return {
        id: pid,
        name,
        grade,
        short,
        long: `${name}: ${short}. ${longLib[pid]}`
      };
    });

    // Derive coaching fixes from the phases (prioritize worse grades)
    const derivedPriority = phases
      .map(p => ({ title: `${p.name}: ${p.short}`, score: p.grade === "needs help" ? 100 : p.grade === "ok" ? 60 : 30 }))
      .sort((a,b)=>b.score-a.score)
      .slice(0,3)
      .map(p=>p.title);

    // Power-specific fixes (derived from power score + tempo/release)
    const powerCandidateFixes = [
      { title: "Use ground forces (post into lead side)", score: 100 - powerScore + 10 },
      { title: "Tempo ladder (2.6 → 3.2:1)", score: Math.abs(["2.6:1","2.8:1","3:1","3.2:1","3.4:1"].indexOf(tempo) - 2) * 15 + 40 },
      { title: "Speed windows: light–med–full", score: 95 - powerScore },
      { title: "Longer arc without extra tension", score: 90 - powerScore },
      { title: "Hold wrist angle into impact", score: 100 - release + 5 }
    ];
    const powerFixes = topNByScore(powerCandidateFixes, 3).map(x=>x.title);

    // Position/swing consistency metrics (deterministic but varied)
    const posMetrics = [
      { name: "Alignment start line", base: 82 },
      { name: "Ball position repeatability", base: 77 },
      { name: "Posture repeatability", base: 79 },
    ].map((m, i) => ({
      name: m.name,
      score: pct(m.base - ((h >> (i+9)) % 16)),
      comment: m.base > 80 ? "Solid trend" : "Work toward tighter window"
    }));

    const swgMetrics = [
      { name: "Club path window", base: 76 },
      { name: "Face to path", base: 74 },
      { name: "Low-point control", base: 78 },
    ].map((m, i) => ({
      name: m.name,
      score: pct(m.base - ((h >> (i+12)) % 18)),
      comment: m.base > 80 ? "Stable pattern" : "Aim for more consistency"
    }));

    // At a glance summary (3 bullets max)
    const atAGlance = [
      `Avg power score: ${powerScore} • Tempo ${tempo} • Release timing ${release}%`,
      `Biggest gains near ${phases.find(p => p.grade === "needs help")?.name || "P5/P6 shallow timing"}.`,
      `Consistency focus: ${topNByScore([...posMetrics, ...swgMetrics], 1, "score", false)[0].name}.`
    ];

    // 14-day practice plan (varied but deterministic)
    const planTitles = [
      "Mirror P1–P2","Tempo ladder","Lead wrist set","Low-point gates",
      "Path & start line","Speed windows","Review & record"
    ];
    const planItems = [
      "Athletic posture checkpoints",
      "Metronome 3:1 — 5 min",
      "Pump-step drill — 10 reps",
      "Bow lead wrist at top — 15 reps",
      "Impact line — 20 brush strikes",
      "Align stick start line — 15 balls",
      "Light–med–full — 15 balls",
      "Film 3 swings and review"
    ];
    const practice_plan = Array.from({ length: 14 }, (_, i) => ({
      day: i + 1,
      title: pick(planTitles, (h >> (i+4)) + i, i),
      items: [
        pick(planItems, (h >> (i+6)) + i, 1),
        pick(planItems, (h >> (i+8)) + i, 2)
      ]
    }));

    const out = {
      status: "ready",
      atAGlance,
      swingScore: powerScore,
      p1p9: phases,
      priorityFixes: derivedPriority,
      powerFixes,
      positionConsistency: posMetrics,
      swingConsistency: swgMetrics,
      power: { score: powerScore, tempo, release_timing: release },
      practice_plan
    };

    return new Response(JSON.stringify(out), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}
