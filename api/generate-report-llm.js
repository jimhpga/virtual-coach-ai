// api/generate-report-llm.js
export const config = { runtime: "nodejs" };

/** Safe JSON parse */
function safeJson(input) {
  try {
    if (!input) return {};
    if (typeof input === "string") return JSON.parse(input);
    return input;
  } catch {
    return {};
  }
}

/** Deterministic enhancement so UI is always filled out */
function buildFallbackEnhancement(report) {
  const meta = report?.meta || {};
  const tempo = meta.tempo || "3:1";

  return {
    topPriorityFixes: [
      "Posture & spine angle stable through P2",
      "Clubface square by P3 (lead wrist flat)",
      "Finish chest to target, 90% lead side",
    ],
    topPowerFixes: [
      "Earlier wrist set by P2.5",
      "Lead hip posts into impact",
      "Release speed later (closer to impact)",
    ],
    positionConsistency: {
      notes: "Set consistent ball position; rehearse same start line.",
    },
    swingConsistency: {
      notes: "Re-center pressure forward by P4; rotate to a held finish.",
    },
    power: {
      score: Math.max(60, Number(report?.swingScore ?? 74)),
      tempo,
      release_timing: 65,
    },
    p1p9: [
      {
        id: "P1",
        name: "Address",
        grade: "ok",
        short: "Athletic stance; weight centered; neutral grip.",
        long:
          "Hand height to hip crease; slight knee flex; align zipper through ball; trail hand soft to avoid shutting face.",
        video:
          "https://www.youtube.com/results?search_query=P1+address+golf",
      },
      {
        id: "P2",
        name: "Takeaway",
        grade: "good",
        short: "One-piece move; club outside hands; face square.",
        long:
          "Keep trail wrist soft; maintain triangle; shaft parallel to target line; avoid early roll-in.",
        video:
          "https://www.youtube.com/results?search_query=P2+takeaway+golf",
      },
      {
        id: "P3",
        name: "Lead arm parallel",
        grade: "ok",
        short: "Width maintained; club parallel to spine.",
        long:
          "Lead wrist more flat; trail elbow points down; don’t over-rotate chest.",
        video:
          "https://www.youtube.com/results?search_query=P3+lead+arm+parallel+golf",
      },
      {
        id: "P4",
        name: "Top",
        grade: "needs help",
        short: "Complete turn; trail elbow under; face not shut.",
        long:
          "Feel trail hip deep; lead wrist flat not cupped; avoid across-the-line; small pause helps sequence.",
        video:
          "https://www.youtube.com/results?search_query=P4+top+of+backswing+golf",
      },
      {
        id: "P5",
        name: "Shaft parallel down",
        grade: "ok",
        short: "Shallow slightly; hands inside clubhead.",
        long:
          "Pressure to lead foot; trail elbow in front of hip; retain wrist angles.",
        video:
          "https://www.youtube.com/results?search_query=P5+downswing+golf",
      },
      {
        id: "P6",
        name: "Club parallel before impact",
        grade: "ok",
        short: "Handle leads; face square; chest open.",
        long:
          "Lead hip posted; keep trail heel light; strike ball then turf.",
        video:
          "https://www.youtube.com/results?search_query=P6+pre+impact+golf",
      },
      {
        id: "P7",
        name: "Impact",
        grade: "good",
        short: "Forward shaft lean; weight left; low point ahead.",
        long:
          "Lead wrist flat/bowed; keep head back of ball; compress with hands leading.",
        video:
          "https://www.youtube.com/results?search_query=P7+impact+golf",
      },
      {
        id: "P8",
        name: "Post impact",
        grade: "ok",
        short: "Arms extend; chest rotates; face passive.",
        long: "Keep width; rotate through; maintain speed into P9.",
        video:
          "https://www.youtube.com/results?search_query=P8+post+impact+golf",
      },
      {
        id: "P9",
        name: "Finish",
        grade: "ok",
        short: "Balanced, chest to target, trail foot up.",
        long:
          "Hold finish; belt buckle to target; weight 90% lead side.",
        video:
          "https://www.youtube.com/results?search_query=P9+finish+golf",
      },
    ],
    practicePlan: Array.from({ length: 14 }, (_, i) => {
      const day = i + 1;
      if (day === 1)
        return {
          day,
          title: "Mirror P1–P2 (10m)",
          items: ["Athletic posture checkpoints", "One-piece takeaway with stick"],
        };
      if (day === 2)
        return {
          day,
          title: "Tempo & pump",
          items: ["Metronome " + tempo + " (5m)", "Pump drill — 10 reps"],
        };
      if (day === 3)
        return {
          day,
          title: "Lead wrist at P4",
          items: ["Bow lead wrist at top — 15 reps", "Record 3 swings"],
        };
      if (day === 4)
        return {
          day,
          title: "Low-point gates",
          items: ["Impact line — 20 brush strikes", "3 slow-motion swings"],
        };
      if (day === 5)
        return {
          day,
          title: "Path & start line",
          items: ["Alignment stick start line — 15 balls"],
        };
      if (day === 6)
        return {
          day,
          title: "Speed windows",
          items: ["Light → medium → full — 15 balls"],
        };
      if (day === 7)
        return {
          day,
          title: "Review",
          items: ["Re-record P1–P4 checkpoints"],
        };
      if (day === 8)
        return {
          day,
          title: "Re-load wrist set",
          items: ["Set by P2.5 — 15 reps"],
        };
      if (day === 9)
        return {
          day,
          title: "Face-to-path",
          items: ["Start left, curve back — 10 balls"],
        };
      if (day === 10)
        return {
          day,
          title: "Ground forces",
          items: ["Hold trail heel, post into lead — 10 reps"],
        };
      if (day === 11)
        return {
          day,
          title: "Tempo " + tempo,
          items: ["Metronome — 5 min"],
        };
      if (day === 12)
        return {
          day,
          title: "Pressure shift",
          items: ["Step-change — 10 reps"],
        };
      if (day === 13)
        return {
          day,
          title: "Combine",
          items: ["Alternate drills — 20 balls"],
        };
      return {
        day,
        title: "Retest",
        items: ["Film 3 swings — upload new report"],
      };
    }),
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
    const body = safeJson(req.body);
    const report = body?.report || {};
    const enhanced = buildFallbackEnhancement(report);
    return res.status(200).json(enhanced);
  } catch (e) {
    // ultra-safe: never throw
    return res.status(200).json(buildFallbackEnhancement({}));
  }
}
