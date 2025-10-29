// api/save-report.js
//
// What this route does:
// 1. Takes swing baseline info from the frontend (POST body).
// 2. Builds a full player report (P1–P9 checkpoints, priorities, 14-day plan).
//    - First tries OpenAI for personalized language.
//    - If OpenAI isn't available or fails, uses local coaching logic.
// 3. Saves the final report JSON to Vercel Blob storage.
// 4. Returns { id, url, enhanced, level, goal } to the frontend.
//
// ENV NEEDED:
//   BLOB_READ_WRITE_TOKEN  (for @vercel/blob write access)
//   OPENAI_API_KEY         (optional; if missing we still return a good report)

export const config = { runtime: "nodejs" };

import { put } from "@vercel/blob";

// -------------------------
// localEnhance: fallback coach brain (no OpenAI needed)
function localEnhance(base) {
  const level  = base.level || base?.meta?.level || "intermediate";
  const goal   = base.goal  || base?.meta?.goal  || "more playable contact";
  const score  = Number(base.swingScore ?? 76);
  const handed = base?.meta?.handed ?? "right";
  const height = base?.meta?.height ?? 70; // inches

  // 9 checkpoint snapshots P1..P9
  const p1p9 = [
    {
      id: "P1",
      name: "Address",
      grade: score > 70 ? "good" : "ok",
      short: "Balanced, athletic setup with neutral grip and calm upper body.",
      long: "Stand tall through the chest, soft knees, and neutral pelvis. Pressure ~55/45 trail/lead. Ball in correct window for the club. Lock this in with a repeatable pre-shot routine.",
      video: "https://www.youtube.com/results?search_query=address+golf+checkpoint"
    },
    {
      id: "P2",
      name: "Takeaway",
      grade: "ok",
      short: "One-piece start; clubhead stays outside the hands; face square early.",
      long: "Turn the ribcage to start the club back. Avoid early forearm roll. Keep width in the triangle and let the trail hip accept pressure instead of sliding.",
      video: "https://www.youtube.com/results?search_query=takeaway+golf+checkpoint"
    },
    {
      id: "P3",
      name: "Lead arm parallel",
      grade: "ok",
      short: "Lead arm across chest with structure; shaft on plane, not steep.",
      long: "Lead wrist flatter, trail wrist set. Pressure moves gently into the trail heel (not toes). This loads you without sway.",
      video: "https://www.youtube.com/results?search_query=P3+lead+arm+parallel+golf"
    },
    {
      id: "P4",
      name: "Top",
      grade: score > 82 ? "good" : "ok",
      short: "Coiled, not lifted. Club supported, not collapsing.",
      long: "Lead shoulder under the chin. Pelvis ~35–45° turned, chest ~80–100°. Trail arm soft, not jammed. You’re loaded, not just long.",
      video: "https://www.youtube.com/results?search_query=P4+top+of+backswing+golf"
    },
    {
      id: "P5",
      name: "Delivery",
      grade: "ok",
      short: "Lower body leads, handle working forward, shaft shallowing.",
      long: "From transition, shift/rotate into the lead side. Trail elbow works in front of trail hip instead of dumping behind you. That’s what keeps path from getting wild.",
      video: "https://www.youtube.com/results?search_query=P5+delivery+position+golf"
    },
    {
      id: "P6",
      name: "Shaft parallel down",
      grade: score > 78 ? "good" : "ok",
      short: "Lag held, face stable, shaft matches target line.",
      long: "Hands near trail thigh with slight forward lean. Chest is already starting to open. Avoid throwing the club early — let rotation square the face, not the flip.",
      video: "https://www.youtube.com/results?search_query=P6+shaft+parallel+downswing+golf"
    },
    {
      id: "P7",
      name: "Impact",
      grade: score > 85 ? "good" : "ok",
      short: "Forward shaft lean, lead side braced, low point ahead.",
      long: "Lead wrist flexed, trail wrist bent. Pressure mostly left. Contact is ball-then-turf, not both at once. This is compression, not just ‘hit hard’.",
      video: "https://www.youtube.com/results?search_query=P7+impact+golf"
    },
    {
      id: "P8",
      name: "Post-impact",
      grade: "ok",
      short: "Arms long, chest turning, no panic flip.",
      long: "Both arms extend as the handle keeps moving left. You don’t stall and throw your hands. That’s how you control start line under pressure.",
      video: "https://www.youtube.com/results?search_query=P8+post+impact+golf"
    },
    {
      id: "P9",
      name: "Finish",
      grade: "good",
      short: "Balanced, fully rotated, weight left, tall hold.",
      long: "~90% of pressure is on the lead side. Belt buckle at the target. Trail foot released. Hold the pose and own it — balance is skill.",
      video: "https://www.youtube.com/results?search_query=P9+finish+golf"
    }
  ];

  // top 3 “do this first” list
  const topPriorityFixes = [
    {
      title: "Face-to-path control",
      why: "Your curve pattern is coming from face closing late instead of the body staying in motion.",
      how: "Quiet the hands at P6, rotate through impact instead of flipping. Use start-line gates (two tees 6–10 feet out) and make the ball start between them five times in a row."
    },
    {
      title: "Earlier post into lead leg",
      why: "If you hang back, you’re forced to throw the face and it turns into the left miss.",
      how: "From the top, feel pressure land into the lead heel ASAP, then keep turning. ‘Pressure left, chest left, hands quiet.’"
    },
    {
      title: "Same setup every time",
      why: "If ball position / stance width keeps wandering, low point wanders and so does start line.",
      how: "Mark your foot and ball lines on a mat. Rehearse 10 setups for irons, 10 for driver. Lock your windows in before you even start ‘hitting balls’."
    }
  ];

  // speed / distance work (only AFTER control)
  const topPowerFixes = [
    {
      title: "Lead-leg brace = free speed",
      why: "When the lead side ‘posts’ and stops, energy jumps up the chain instead of leaking.",
      how: "Impact drills where you ‘stick’ the lead leg posted and hold for 2 counts. You’re training brake, not just push."
    },
    {
      title: "Dynamic pressure shift",
      why: "Small/no pressure shift means you’re arm-swinging speed instead of using the ground.",
      how: "Step-change drill: step into the lead foot while you swing, then blend it back to normal. Do 10 slow, then 3 at normal rhythm on camera."
    },
    {
      title: "Speed windows",
      why: "If you only ever swing ‘full’, you don’t learn how to add speed controllably.",
      how: "Hit 5 shots at ‘easy’, 5 at ‘normal’, 5 at ‘full intent’, but hold balance on every finish. Twice per week max."
    }
  ];

  // 14-day block, alternating skill + speed/tempo
  const practicePlan = Array.from({ length: 14 }, (_, i) => {
    const day = i + 1;
    const isSkillDay = day % 2 === 1;
    return {
      day,
      title: isSkillDay
        ? "Contact & start line"
        : "Pressure shift / tempo control",
      items: isSkillDay
        ? [
            "Mirror checkpoints P1–P3 (setup + takeaway) for 10 slow reps.",
            "Impact line drill: brush the ground slightly ahead of the ball line 15 times.",
            "3 slow swings holding finish for 2 beats."
          ]
        : [
            "Step-change / post-into-lead-leg drill x10.",
            "Metronome or count 3:1 backswing:downswing rhythm for 5 minutes.",
            "Film 3 normal swings. Look for balance at finish."
          ]
    };
  });

  const summary_long = [
    `Level: ${level}. Goal: ${goal}. Height: ${height} in. Handed: ${handed}.`,
    `Setup is mostly athletic and playable. Biggest variability shows up later, when the face starts closing faster than the body is turning.`,
    `The pull/over-draw pattern isn’t “you’re too fast,” it’s “you’re stuck then you dump the face.” You can fix that by getting into the lead side sooner and letting rotation square the face for you instead of flipping it.`,
    `Your delivery around P6–P7 is close to something you can trust under pressure. When you post into the lead leg and keep your chest moving, low point and start line both settle down.`,
    `Speed will come. But not yet. First we make the ball start where you’re looking. Then we layer in step-change, lead-leg post, and finish-balance holds to safely add mph.`,
    `The 14-day plan below is built to repeat: contact/line day, then pressure/tempo day. That rhythm builds a swing you can actually take to the course instead of a pretty rehearsal that dies on the first tee.`
  ].join(" ");

  const positionConsistency = {
    notes:
      "Setup and early motion (P1–P3) repeat decently. The main wobble is face control in transition — you stall, then flip. Locking in lead-side post and chest turn through P6 will tighten start line fast."
  };

  const swingConsistency = {
    notes:
      "Tempo is roughly 3:1 on stock swings, but leaks faster when you go after it. Keep ‘finish and hold’ across all intent levels so speed doesn’t turn into chaos."
  };

  return {
    model: "local",
    enhanced: false,
    summary_long,
    p1p9,
    topPriorityFixes,
    topPowerFixes,
    power: {
      score: score,
      tempo: "3:1",
      release_timing: 62
    },
    positionConsistency,
    swingConsistency,
    practicePlan
  };
}

// -------------------------
// enhanceWithOpenAI: ask OpenAI to generate a richer version
async function enhanceWithOpenAI(base) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    // no AI key => fallback now
    return localEnhance(base);
  }

  // build strict JSON prompt for OpenAI
  const prompt = `
You are a world-class golf coach. Return ONLY valid JSON in this shape:

{
  "summary_long": "6-10 sentence personalized narrative summary",
  "p1p9": [
    { "id":"P1","name":"Address","grade":"good|ok|needs work","short":"2-3 sentence checkpoint summary","long":"3-6 sentence coaching detail","video":"YouTube search URL" },
    ...
    { "id":"P9", ... }
  ],
  "topPriorityFixes": [
    { "title":"...", "why":"1-2 sentences", "how":"2-4 steps/drills" },
    { ... },
    { ... }
  ],
  "topPowerFixes": [
    { "title":"...", "why":"1-2 sentences", "how":"2-4 steps/drills" },
    { ... },
    { ... }
  ],
  "power": { "score": 0-100, "tempo": "like 3:1", "release_timing": 0-100 },
  "positionConsistency": { "notes": "2-3 sentences, honest but not insulting." },
  "swingConsistency":    { "notes": "2-3 sentences about repeatability / tempo / under pressure." },
  "practicePlan": [
    { "day":1, "title":"...", "items":["...","...","..."] },
    ...
    { "day":14, "title":"...", "items":["...","...","..."] }
  ]
}

Personalize using:
- swingScore = ${Number(base.swingScore ?? 76)}
- level = ${base?.meta?.level || base.level || "intermediate"}
- goal = ${base?.meta?.goal || base.goal || "more playable contact"}
- handed = ${base?.meta?.handed || "right"}
- heightInches = ${base?.meta?.height || 70}

Voice/tone rules:
- Talk like a PGA lesson tee coach, not a robot.
- Be direct. No shame.
- Use real checkpoints like P1, P6, impact, start line, lead-side post.
- Make sure language is simple enough for a normal golfer to act on.
- Absolutely DO NOT include Markdown, no backticks, no code fences.
- Respond with ONLY the JSON. No extra words.
`.trim();

  // Hit OpenAI Responses API directly with fetch
  let resp;
  try {
    resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
        response_format: { type: "json_object" }
      })
    });
  } catch (err) {
    console.error("OpenAI fetch failed:", err);
    return localEnhance(base);
  }

  if (!resp || !resp.ok) {
    console.error("OpenAI bad status:", resp && resp.status);
    return localEnhance(base);
  }

  let data;
  try {
    data = await resp.json();
  } catch {
    console.error("OpenAI .json() parse fail");
    return localEnhance(base);
  }

  // New Responses API can stick final plain text in output_text.
  // We'll try that first, then fall back.
  const txt =
    (data && data.output_text) ||
    (data && data.output && data.output[0] && data.output[0].content && data.output[0].content[0] && data.output[0].content[0].text) ||
    "";

  if (!txt) {
    console.error("OpenAI: empty output_text");
    return localEnhance(base);
  }

  try {
    const parsed = JSON.parse(txt);
    return {
      model: "gpt-4.1-mini",
      enhanced: true,
      ...parsed
    };
  } catch (err) {
    console.error("OpenAI JSON.parse failed:", err);
    return localEnhance(base);
  }
}

// -------------------------
// API handler
export default async function handler(req, res) {
  // Only allow POST. We could allow GET for health if you want.
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ error: "Method Not Allowed. Use POST with { ...reportFields }" });
  }

  try {
    // Vercel sometimes gives you req.body as object,
    // sometimes as string, sometimes as stream.
    // We'll handle object and string here, since Blob writes aren't huge.
    let body = req.body;
    if (!body || typeof body !== "object") {
      if (typeof body === "string") {
        try {
          body = JSON.parse(body || "{}");
        } catch {
          body = {};
        }
      } else {
        // read raw stream
        let rawText = "";
        for await (const chunk of req) {
          rawText += chunk;
        }
        try {
          body = JSON.parse(rawText || "{}");
        } catch {
          body = {};
        }
      }
    }

    // Build a base report skeleton from what frontend sent
    const base = {
      schema: "1.0",
      created: new Date().toISOString(),
      status: body.status ?? "ready",
      swingScore: body.swingScore ?? 76,
      muxPlaybackId: body.muxPlaybackId ?? null,
      muxUploadId: body.muxUploadId ?? null,

      // level/goal can come from meta, hints, or root
      level: body?.meta?.level || body?.hints?.level || body.level,
      goal:  body?.meta?.goal  || body?.hints?.goal  || body.goal,

      meta: body.meta || {},
      note: body.note || ""
    };

    // Get AI-enhanced section (OpenAI if available; fallback otherwise)
    const ai = await enhanceWithOpenAI(base);

    // Final report we will persist and return
    const report = {
      ...base,
      enhanced: !!ai.enhanced,
      level: base.level || base?.meta?.level,
      goal:  base.goal  || base?.meta?.goal,

      ai: {
        model: ai.model || (ai.enhanced ? "LLM" : "local"),
        enhanced: !!ai.enhanced,
        version: 1
      },

      summary_long: ai.summary_long,
      p1p9: ai.p1p9,
      topPriorityFixes: ai.topPriorityFixes,
      topPowerFixes: ai.topPowerFixes,
      power: ai.power,
      positionConsistency: ai.positionConsistency,
      swingConsistency: ai.swingConsistency,
      practicePlan: ai.practicePlan
    };

    // We'll store reports/<id>.json
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const key = `reports/${id}.json`;

    // Save JSON to Vercel Blob
    // Requires BLOB_READ_WRITE_TOKEN set in Vercel Project Env
    const { url } = await put(
      key,
      JSON.stringify(report, null, 2),
      {
        access: "public",
        contentType: "application/json"
      }
    );

    console.log("[save-report]", {
      id,
      enhanced: report.enhanced,
      level: report.level,
      goal: report.goal
    });

    // Send response back to the browser
    return res.status(200).json({
      ok: true,
      id,
      url,
      enhanced: report.enhanced,
      level: report.level,
      goal: report.goal
    });
  } catch (e) {
    console.error("save-report fatal error:", e);

    return res.status(500).json({
      ok: false,
      error: String(e?.message || e),
      hint:
        "Make sure BLOB_READ_WRITE_TOKEN is set on Vercel. For AI sections, also set OPENAI_API_KEY."
    });
  }
}
