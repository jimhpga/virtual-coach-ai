// api/save-report.js
export const config = { runtime: "nodejs" }; // keep Node runtime

import { put } from "@vercel/blob";

/* Helpers */
const isArr = (v) => Array.isArray(v);
const obj  = (v, d = {}) => (v && typeof v === "object" ? v : d);

/**
 * Minimal defaults so the viewer always has something to render.
 * You can tweak these to your liking, or keep them empty shells.
 */
function withDefaults(input) {
  const body = obj(input);

  // Allow older field name p1p9 OR newer "phases"
  const phases = isArr(body.phases)
    ? body.phases
    : isArr(body.p1p9)
    ? body.p1p9
    : [];

  const coaching = obj(body.coaching, {});
  const priority_fixes = isArr(coaching.priority_fixes) ? coaching.priority_fixes : [];
  const power_fixes    = isArr(coaching.power_fixes)    ? coaching.power_fixes    : [];

  const position_metrics = isArr(body.position_metrics) ? body.position_metrics : [];
  const swing_metrics    = isArr(body.swing_metrics)    ? body.swing_metrics    : [];

  const power = obj(body.power, {
    score: 0,
    tempo: "—",
    release_timing: 0
  });

  const practice_plan = isArr(body.practice_plan) ? body.practice_plan : [];

  return {
    schema: "1.0",
    created: new Date().toISOString(),
    status: body.status ?? "ready",

    // summary
    swingScore: body.swingScore ?? body.score ?? 75,

    // media / ingestion
    muxPlaybackId: body.muxPlaybackId ?? null,
    muxUploadId: body.muxUploadId ?? null,

    // sections
    phases,
    coaching: { priority_fixes, power_fixes },
    position_metrics,
    swing_metrics,
    power,
    practice_plan,

    // misc
    note: body.note || "",
    meta: obj(body.meta)
  };
}

export default async function handler(req, res) {
  // Basic CORS (optional but handy if you ever POST from another origin)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Parse body safely whether it arrived as text or JSON
    const raw = typeof req.body === "string" ? req.body : (req.body ?? {});
    const data = typeof raw === "string" ? JSON.parse(raw || "{}") : raw;

    const id  = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const key = `reports/${encodeURIComponent(id)}.json`;

    // Build report with defaults
    const report = withDefaults(data);

    // Write to Vercel Blob (public). Pretty-print so it's easy to inspect.
    const { url } = await put(key, JSON.stringify(report, null, 2), {
      access: "public",
      contentType: "application/json; charset=utf-8"
    });

    return res.status(200).json({ id, url });
  } catch (e) {
    return res.status(500).json({
      error: String(e?.message || e),
      hint:
        "Ensure @vercel/blob is installed and BLOB_READ_WRITE_TOKEN is set in your env."
    });
  }
}
