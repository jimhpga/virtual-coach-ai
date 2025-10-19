// api/analyze-stub.js
export const config = { runtime: "edge" };

/* --------------------- utilities --------------------- */

// 32-bit FNV-1a hash for determinism
function hash32(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
// deterministic RNG
function rng(seed) {
  let x = seed >>> 0;
  return () => {
    // xorshift32
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return (x >>> 0) / 4294967296;
  };
}
const clamp01 = v => Math.max(0, Math.min(1, v));
const pct = v => Math.max(0, Math.min(100, Math.round(v)));
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
const topNBy = (arr, n, key, desc = true) =>
  [...arr].sort((a,b)=> desc ? (b[key]-a[key]) : (a[key]-b[key])).slice(0,n);

/* --------------------- parsing --------------------- */

function parseFilename(raw="") {
  const s = raw.toLowerCase();
  const club =
    /driver|big stick|1w/.test(s) ? "driver" :
    /7i|7-?iron|seven iron/.test(s) ? "7-iron" :
    /pw|wedge|sw|aw|lob/.test(s) ? "wedge" :
    /iron/.test(s) ? "iron" : "unknown";

  const view =
    /(dtl|down[\s-]?the[\s-]?line)/.test(s) ? "dtl" :
    /(fo|face[\s-]?on|front)/.test(s) ? "fo" : "unknown";

  const slowmo = /slow|120fps|240fps|high[\s-]?fps/.test(s);
  const fps = /(\d{2,3})\s*fps/.exec(s)?.[1] ?? (slowmo ? "120" : "");

  const miss =
    /slice|fades?/.test(s) ? "slice" :
    /hook|draws?/.test(s) ? "hook" :
    /push/.test(s) ? "push" :
    /pull/.test(s) ? "pull" :
    /fat|heavy/.test(s) ? "fat" :
    /thin|blade/.test(s) ? "thin" : "neutral";

  return { club, view, slowmo, fps, miss };
}

function archetypeFromMeta(meta = {}) {
  const hcap = Number(meta.hcap ?? meta.handicap ?? NaN);
  if (!isFinite(hcap)) return { level: "Improver", tone: "encouraging" };
  if (hcap <= 5)  return { level: "Competitive", tone: "direct" };
  if (hcap <= 14) return { level: "Improver", tone: "encouraging" };
  return { level: "Beginner", tone: "supportive" };
}

function handedWord(handed, leftWord, rightWord) {
  return (String(handed).toLowerCase()==="left") ? leftWord : rightWord;
}

/* --------------------- content libraries --------------------- */

const PHASE_NAMES = [
  "Address","Takeaway","Lead arm parallel","Top",
  "Lead arm parallel (down)","Club parallel (down)",
  "Impact","Post impact","Finish"
];

function shortLine(pid, env) {
  const left = env.handed === "left";
  const club = env.club;
  const cam  = env.view;
  const miss = env.miss;
  const items = {
    P1: [
      `Athletic posture, ${left?"trail":"lead"} foot slightly flared`,
      `Ball ${club==="driver" ? "forward" : "just forward of center"}; ${left?"target":"trail"} hand soft`,
      `Neutral grip; handle height fits ${env.heightCat} build`
    ],
    P2: [
      `${cam==="dtl"?"One-piece takeaway on the plane line":"Triangle intact; match face to spine"}`,
      `${miss==="slice"?"Avoid rolling open early":"Avoid rolling inside early"}`,
      `Early wrist set ${club==="driver"?"minimal":"supported"}`
    ],
    P3: [
      "Maintain width; hands in front of chest",
      `${club==="driver"?"Club slightly laid-off is fine":"Slight shallow is ideal"}`,
      "Face in line with lead forearm"
    ],
    P4: [
      "Full turn; trail wrist extended",
      `${miss==="hook"?"Avoid across the line":"Stay out of across-the-line"}`,
      "Chin up; balanced against trail instep"
    ],
    P5: [
      "Shallow from the top; trail elbow in front of hip",
      `${cam==="dtl"?"Hands drop inside the delivery window":"Maintain shaft pitch change"}`,
      `${club==="wedge"?"Keep loft; no early deloft":"Store wrist angles"}`,
    ],
    P6: [
      "Club parallel; hands slightly ahead of clubhead",
      "Face matched to path; low-point already forward",
      "Lead side posting up"
    ],
    P7: [
      `${handedWord(env.handed,"Handle right of ball","Handle left of ball")}; ball-first contact`,
      "Chest open; lead hip cleared",
      `${miss==="fat"?"Keep pressure forward":"Neutral shaft lean to suit club"}`
    ],
    P8: [
      "Arms extend; club exits low-left around body",
      "Face squares from rotation, not hands",
      "Re-center on lead side"
    ],
    P9: [
      "Balanced; belt buckle at target",
      "Tall finish; trail foot released",
      "Eyes level; no fall-back"
    ]
  };
  const arr = items[pid];
  return arr[(env.r() * arr.length) | 0];
}

function longLine(pid, env, short) {
  const why = {
    P1: "Setup dictates motion. Small changes here make big differences without rebuilding the swing.",
    P2: "The first move sets the shaft pitch and clubface behavior for the rest of the swing.",
    P3: "Width and face-control keep the downswing predictable.",
    P4: "A full turn with a stable face gives you time to shallow and deliver.",
    P5: "Shallowing early reduces handle-stall and steep strikes.",
    P6: "Matching face-to-path and getting low-point forward eliminates big curvature and fats.",
    P7: "Impact is a by-product. Organize pressure and pivots; the handle and face respond.",
    P8: "Rotation continues past the strike; you don’t have to save it with the hands.",
    P9: "Balanced finish tells you path, face and pressure were managed."
  };
  const adjust = [];
  if (env.club === "driver")   adjust.push("With driver, keep handle neutral at impact and tee height consistent.");
  if (env.club === "wedge")    adjust.push("With wedges, prioritize loft retention and low-point control.");
  if (env.view === "fo")       adjust.push("From face-on, monitor pressure shift and handle travel.");
  if (env.view === "dtl")      adjust.push("From down-the-line, monitor shaft pitch and plane line.");
  if (env.heightCat === "taller") adjust.push("For taller builds, soften knee flex to avoid standing the club up.");
  if (env.heightCat === "shorter") adjust.push("For shorter builds, raise handle slightly to keep face stable.");

  return `${short}. ${why[pid]} ${adjust.join(" ")}`.trim();
}

/* --------------------- metrics & scores --------------------- */

function powerBlock(r, arche, club, miss) {
  // baseline by archetype
  const base = arche.level === "Competitive" ? 82 :
               arche.level === "Improver"    ? 72 : 60;
  // club influences
  const clubAdj = club === "driver" ? 6 : club === "7-iron" ? 2 : 0;
  // miss influences
  const missAdj =
    miss === "slice" ? -4 :
    miss === "hook"  ? -2 :
    miss === "fat"   ? -6 :
    miss === "thin"  ? -3 : 0;

  const score = pct(base + clubAdj + missAdj + Math.round((r()-0.5)*8));
  const tempoSet = ["2.6:1","2.8:1","3:1","3.2:1","3.4:1"];
  const idealIdx = 2; // 3:1
  const tIdx = Math.max(0, Math.min(tempoSet.length-1, idealIdx + (score<70?1:score>80?-1:0)));
  const tempo = tempoSet[tIdx];
  const release = pct(55 + (score-50) + Math.round((r()-0.5)*10));
  return { score, tempo, release_timing: release };
}

function consistencyBlocks(r, arche, view) {
  const base = arche.level === "Competitive" ? 82 :
               arche.level === "Improver"    ? 74 : 66;
  const camAdj = view === "dtl" ? 2 : 0;

  const pos = [
    { name:"Alignment start line", base: base+camAdj },
    { name:"Ball position repeatability", base: base-2 },
    { name:"Posture repeatability", base: base-1 }
  ].map((m,i)=>({ name:m.name, score: pct(m.base + Math.round((r()-0.5)*8)), comment:"" }));

  const swg = [
    { name:"Club path window", base: base-1 },
    { name:"Face to path", base: base-2 },
    { name:"Low-point control", base: base }
  ].map((m,i)=>({ name:m.name, score: pct(m.base + Math.round((r()-0.5)*8)), comment:"" }));

  return { pos, swg };
}

/* --------------------- main handler --------------------- */

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405 });
  }

  try {
    const body = await req.json(); // { filename?, meta?, height? }
    const filename = String(body?.filename || body?.note || "");
    const meta = body?.meta || {};
    const parsed = parseFilename(filename);
    const handed = String(meta.handed || "").toLowerCase() || "right";
    const heightIn = Number(meta.height ?? NaN);
    const heightCat = isFinite(heightIn) ? (heightIn >= 73 ? "taller" : heightIn <= 66 ? "shorter" : "average") : "average";
    const arche = archetypeFromMeta(meta);

    const seed = hash32(
      [filename, meta?.email || "", meta?.name || "", meta?.hcap || ""].join("|")
    );
    const r = rng(seed);

    // Environment passed to content generators
    const env = {
      r, handed, club: parsed.club, view: parsed.view, miss: parsed.miss,
      heightCat
    };

    // Build P1–P9 with grade weighting (Competitive fewer red flags)
    const grades = ["good","ok","needs help"];
    const phaseObjs = PHASE_NAMES.map((name,i)=>{
      const pid = `P${i+1}`;
      // grade tendency
      const baseIdx = arche.level === "Competitive" ? 0.3 : arche.level === "Improver" ? 0.8 : 1.1;
      let gPick = r() + (parsed.miss !== "neutral" ? 0.18 : 0) + (i>=4 && i<=6 ? 0.12 : 0); // worse around transition/impact if miss present
      const idx = gPick < baseIdx ? 0 : gPick < baseIdx + 0.55 ? 1 : 2;
      const grade = grades[Math.min(2, idx)];

      const short = shortLine(pid, env);
      const long = longLine(pid, env, short);

      return { id: pid, name, grade, short, long };
    });

    // Weakness ranking → top 3 priority fixes
    const priorityFixes = topNBy(
      phaseObjs.map(p => ({
        title: `${p.name}: ${p.short}`,
        score: p.grade === "needs help" ? 100 : p.grade === "ok" ? 65 : 35
      })),
      3, "score", true
    ).map(x=>x.title);

    // Power block
    const power = powerBlock(r, arche, parsed.club, parsed.miss);

    // Power-specific fixes based on block + miss + club
    const powerCandidates = [
      { title:"Use ground forces: post into lead side", score: 100 - power.score + 8 },
      { title:"Tempo ladder to 3:1", score: Math.abs(["2.6:1","2.8:1","3:1","3.2:1","3.4:1"].indexOf(power.tempo)-2)*15 + 40 },
      { title:`Speed windows (${parsed.club==="driver"?"light-med-full drivers":"progressive irons"})`, score: 95 - power.score },
      { title:"Longer arc without tension", score: 88 - power.score },
      { title:"Hold wrist angle into impact", score: 100 - power.release_timing + 6 },
      { title:"Face-to-path checkpoints", score: parsed.miss!=="neutral" ? 92 : 70 }
    ];
    const powerFixes = topNBy(powerCandidates, 3, "score", true).map(x=>x.title);

    // Consistency metrics
    const { pos: positionConsistency, swg: swingConsistency } =
      consistencyBlocks(r, arche, parsed.view);

    // At-a-glance summary
    const bullets = [];
    bullets.push(
      `File suggests ${parsed.view==="dtl"?"down-the-line":"face-on"}${parsed.view==="unknown"?"":" view"} with ${parsed.club==="unknown"?"a club":parsed.club}.`
    );
    if (parsed.miss !== "neutral") bullets.push(`Common miss in filename: ${parsed.miss}. We’ve biased fixes toward that.`);
    bullets.push(`Archetype: ${arche.level} • Tempo ${power.tempo} • Power ${power.score} • Release ${power.release_timing}%`);
    if (handed==="left") bullets.push("All references are mirrored for a left-handed player.");

    // Practice plan (28 days, grouped by week with themes)
    const weeklyThemes = [
      "Foundations (P1–P2, low-intensity contact)",
      "Shallow & Deliver (P4–P6 windows)",
      "Impact & Low-point (start-line/brush drills)",
      "Blend & Speed (combine + calibration)"
    ];
    const drillLib = (h) => [
      handedWord(h,"Mirror P1–P2 with right-hand lead","Mirror P1–P2 with left-hand lead"),
      "Metronome 3:1 — 5 min",
      "Pump-step drill — 10 reps",
      handedWord(h,"Trail-hand throw to shallow","Lead-hand pull to shallow"),
      "Alignment-stick start line — 15 balls",
      "Impact line — 20 brush strikes",
      "Speed windows — light/med/full — 15 balls",
      "Record 3 swings and review"
    ];
    const drills = drillLib(handed);

    const practice_plan = Array.from({length:28}, (_,i)=>{
      const day = i+1;
      const wk  = Math.floor(i/7);
      return {
        day,
        title: `${weeklyThemes[wk]}`,
        items: [
          pick(drills, r),
          pick(drills, r)
        ]
      };
    });

    // Output
    const out = {
      status: "ready",
      atAGlance: bullets,
      swingScore: power.score,
      p1p9: phaseObjs,
      priorityFixes,
      powerFixes,
      positionConsistency,
      swingConsistency,
      power,
      practice_plan,
      metaEcho: {
        name: meta.name || "",
        handed, dominantEye: meta.eye || "",
        height: meta.height || "",
        hcap: meta.hcap || meta.handicap || "",
        club: parsed.club, view: parsed.view, miss: parsed.miss, slowmo: parsed.slowmo, fps: parsed.fps,
        archetype: arche.level
      }
    };

    return new Response(JSON.stringify(out), {
      headers: { "content-type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}
