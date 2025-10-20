// /lib/pro-library.js
// Minimal pro library + retrieval. Replace/extend with your 100 players.

const PROS = [
  {
    id: "p_m_compact_driver_dtl",
    gender: "M",
    handed: "right",
    height_in: 71,
    archetype: "Competitive",
    club: "driver",
    view: "dtl",
    tempo: "2.8:1",
    release_timing: 72,
    common_miss: "neutral",
    notes: {
      // very compact data the LLM can use for patterning
      p1p9: [
        { id: "P1", short: "Athletic, neutral stance. Handle mid-thigh.", long: "Pressure ~55% lead; arms hang, trail elbow soft; eyes over ball-target line." },
        { id: "P2", short: "One-piece takeaway, club outside hands.", long: "Lead wrist flat; shaft parallel to target line; pelvis 10–15° open." },
        { id: "P3", short: "Width maintained.", long: "Lead arm straight; trail elbow near rib; pressure moving 60% trail." },
        { id: "P4", short: "Top short of parallel.", long: "Lead wrist slightly bowed; trail hip loaded; ribcage 80–90° turned." },
        { id: "P5", short: "Slotting from the inside.", long: "Trail elbow in front of seam; shaft shallows 5–10°; lead knee flexing." },
        { id: "P6", short: "Shaft on forearm, face stable.", long: "Pelvis 30–40° open; pressure 70% lead; lead wrist stable." },
        { id: "P7", short: "Hands slightly ahead, ball forward.", long: "Upper open 10–15°; handle ahead by ~½ grip; face square." },
        { id: "P8", short: "Post on lead side.", long: "Arms extend; trail heel peeling; chest down, low finish window." },
        { id: "P9", short: "Balanced, chest left.", long: "Lead leg straightened; pelvis fully rotated; decel clean." }
      ]
    }
  },
  {
    id: "p_w_long_lever_7i_fo",
    gender: "F",
    handed: "right",
    height_in: 66,
    archetype: "Competitive",
    club: "7-iron",
    view: "fo",
    tempo: "3:1",
    release_timing: 74,
    common_miss: "pull",
    notes: {
      p1p9: [
        { id: "P1", short: "Narrow stance, slight lead tilt.", long: "Ball center; handle ahead by ½–1”; pressure 55% lead." },
        { id: "P2", short: "Clubhead outside hands.", long: "Lead wrist flat; trail wrist extends; pelvis 10° open." },
        { id: "P3", short: "Width and depth.", long: "Lead arm across chest; trail elbow lightly in; ribcage 60–70°." },
        { id: "P4", short: "Full coil, modest wrist set.", long: "Lead wrist slightly flexed; trail hip deep; pressure 65% trail." },
        { id: "P5", short: "Shallow, handle forward.", long: "Lead knee flexing; pelvis opens; shaft just above trail forearm." },
        { id: "P6", short: "Face stable to path.", long: "Handle forward; pressure 70% lead; trail elbow attached." },
        { id: "P7", short: "Forward shaft, ball-first.", long: "Hands ~4–6” ahead; loft managed; face square to arc." },
        { id: "P8", short: "Extending through.", long: "Arms long; chest to target; lead side braced." },
        { id: "P9", short: "Balanced, high finish.", long: "Ribs stacked; pelvis forward; tempo holds 3:1 cadence." }
      ]
    }
  },

  // … paste your other 98 pros here …
];

// --- Helpers ------------------------------------------------------------

function heightBand(inches) {
  if (!Number.isFinite(inches)) return "any";
  if (inches < 66) return "short";
  if (inches <= 72) return "avg";
  return "tall";
}

function parseFilename(raw = "") {
  const s = raw.toLowerCase();
  const club =
    /driver|1w/.test(s) ? "driver" :
    /pw|sw|aw|wedge|lob/.test(s) ? "wedge" :
    /7i|7-?iron/.test(s) ? "7-iron" :
    /iron/.test(s) ? "iron" : "unknown";
  const view =
    /(dtl|down[\s-]?the[\s-]?line)/.test(s) ? "dtl" :
    /(fo|face[\s-]?on|front)/.test(s) ? "fo" : "unknown";
  const miss =
    /slice|fade/.test(s) ? "slice" :
    /hook|draw/.test(s) ? "hook" :
    /push/.test(s) ? "push" :
    /pull/.test(s) ? "pull" :
    /fat|heavy/.test(s) ? "fat" :
    /thin|blade/.test(s) ? "thin" : "neutral";
  return { club, view, miss };
}

// Very fast heuristic matcher (no embeddings required). Good enough for MVP.
export function getSimilarPros({ meta = {}, filename = "", baseline = {}, k = 3 }) {
  const q = parseFilename(filename);
  const qHand = (meta.handed || "").toLowerCase() || "right";
  const qHB = heightBand(Number(meta.height));
  const qTempo = baseline?.tempo || "3:1";
  const qMiss = q.miss;

  function score(pro) {
    let s = 0;
    if (q.club !== "unknown" && pro.club === q.club) s += 3;
    if (q.view !== "unknown" && pro.view === q.view) s += 2;
    if (pro.handed === qHand) s += 2;
    if (pro.common_miss === qMiss) s += 1;
    if (pro.tempo === qTempo) s += 1;
    // gentle nudge by height band
    const proHB = heightBand(pro.height_in);
    if (proHB === qHB || qHB === "any") s += 1;
    return s;
  }

  const ranked = PROS
    .map(p => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map(({ p }) => ({
      id: p.id,
      gender: p.gender,
      handed: p.handed,
      club: p.club,
      view: p.view,
      tempo: p.tempo,
      release_timing: p.release_timing,
      common_miss: p.common_miss,
      height_in: p.height_in,
      p1p9: p.notes.p1p9
    }));

  return ranked;
}
