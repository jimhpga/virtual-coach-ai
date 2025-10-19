// /api/save-report.js
export const config = { runtime: "nodejs" };

import { put } from "@vercel/blob";

function defaultAnalysis(meta = {}) {
  return {
    // P1–P9 checkpoints
    p1p9: [
      { id: "P1", name: "Address",          grade: "ok",         short: "Athletic, neutral." },
      { id: "P2", name: "Takeaway",         grade: "good",       short: "One-piece, on plane." },
      { id: "P3", name: "Lead arm parallel",grade: "ok",         short: "Width is good." },
      { id: "P4", name: "Top",              grade: "needs help", short: "Slightly across line; soften trail wrist." },
      { id: "P5", name: "Lead arm parallel dwn", grade: "ok",     short: "Trail elbow in front of seam." },
      { id: "P6", name: "Club parallel dwn",     grade: "good",   short: "Face square to path." },
      { id: "P7", name: "Impact",                grade: "good",   short: "Handle forward, ball-first strike." },
      { id: "P8", name: "Post-impact",           grade: "ok",     short: "Extending to target." },
      { id: "P9", name: "Finish",                grade: "good",   short: "Balanced and tall." }
    ],
    // “Power Score Summary”
    power: {
      score: 76,
      tempo: "3:1",
      release_timing: 62
    },
    // “Swing Consistency / Position Consistency”
    consistency: {
      position: { dispersion: 0.18, contact: 0.72 },
      swing:    { pathVar: 0.22, faceVar: 0.17 }
    },
    // 14-day practice plan
    practice_plan: [
      { day:  1, title: "Mirror P1–P2 (10m)",      items: ["Athletic posture checkpoints","One-piece takeaway with stick"] },
      { day:  2, title: "Tempo & Pump step",       items: ["Metronome 3:1 — 5m","Pump step drill — 10 reps"] },
      { day:  3, title: "Lead wrist at P4",        items: ["Bow lead wrist at top — 15 reps","Record 3 swings"] },
      { day:  4, title: "Low-point gates",         items: ["Impact line — 20 brush strikes","3 slow-motion swings"] },
      { day:  5, title: "Path & start line",       items: ["Alignment stick start line — 15 balls"] },
      { day:  6, title: "Speed windows",           items: ["Light–medium–full windows — 15 balls"] },
      { day:  7, title: "Review + light day",      items: ["Re-record P1–P4 checkpoints"] },
      { day:  8, title: "Re-load wrist set",       items: ["Set by P2.5 — 15 reps"] },
      { day:  9, title: "Face-to-path",            items: ["Start left, curve back — 10 balls"] },
      { day: 10, title: "Ground forces",           items: ["Hold trail heel, post into lead — 10 reps"] },
      { day: 11, title: "Tempo 3:1",               items: ["Metronome — 5 min"] },
      { day: 12, title: "Pressure shift",          items: ["Step-change — 10 reps"] },
      { day: 13, title: "Combine",                 items: ["Alternate drills — 20 balls"] },
      { day: 14, title: "Retest",                  items: ["Film 3 swings — upload new report"] }
    ],
    // handy mirrors to what your viewer already reads
    faults: [
      { title: "Across-line at P4",  fix: "Soften trail wrist; feel 'laid-off' rehearsal to neutral." },
      { title: "Tempo drifts fast",  fix: "Metronome 3:1; count 1-2-3 back, 1 down." },
      { title: "Late release",       fix: "Pump drill; release by lead thigh." }
    ],
    note: meta?.note || ""
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const key = `reports/${id}.json`;

    // Merge defaults with request
    const defaults = defaultAnalysis(body.meta);
    const report = {
      schema: "1.0",
      created: new Date().toISOString(),
      status: body.status ?? "ready",
      swingScore: body.swingScore ?? 80,
      muxPlaybackId: body.muxPlaybackId ?? null,
      muxUploadId: body.muxUploadId ?? null,

      // sections (use client-provided or add defaults)
      p1p9: Array.isArray(body.p1p9) && body.p1p9.length ? body.p1p9 : defaults.p1p9,
      power: body.power || defaults.power,
      consistency: body.consistency || defaults.consistency,
      practice_plan: Array.isArray(body.practice_plan) && body.practice_plan.length
        ? body.practice_plan
        : defaults.practice_plan,

      faults: Array.isArray(body.faults) && body.faults.length ? body.faults : defaults.faults,
      note: body.note || defaults.note,
      meta: body.meta || {}
    };

    const { url } = await put(key, JSON.stringify(report), {
      access: "public",
      contentType: "application/json"
    });

    return res.status(200).json({ id, url });
  } catch (e) {
    return res.status(500).json({
      error: String(e?.message || e),
      hint: "Check @vercel/blob and your BLOB_READ_WRITE_TOKEN."
    });
  }
}

