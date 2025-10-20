// api/save-report.js
export const config = { runtime: "nodejs" };

import { put } from "@vercel/blob";

/* ----------------- helpers ----------------- */
const safeJson = (x) => {
  try { if (!x) return {}; if (typeof x === "string") return JSON.parse(x); return x; }
  catch { return {}; }
};
const nowIso = () => new Date().toISOString();
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const BLOB_BASE =
  process.env.BLOB_PUBLIC_BASE ||
  "https://yw0bpv5czlbqowjq.public.blob.vercel-storage.com";

/** Try to detect the correct base URL for this request. */
function inferOrigin(req) {
  // Vercel: use x-forwarded-proto + host; local: http://localhost:3000
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host;
  if (host) return `${proto}://${host}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function callInternalEnhancer(origin, baseReport) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(`${origin}/api/generate-report-llm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ report: baseReport }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      throw new Error(`Enhancer ${r.status}: ${txt.slice(0, 200)}`);
    }
    return await r.json();
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

/** Fallback: talk to OpenAI directly if internal route fails. */
async function callOpenAIInline(baseReport) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const system = `
You are a senior golf coach writing STRICT JSON only.
Enhance a base swing report with: topPriorityFixes, topPowerFixes,
positionConsistency{notes}, swingConsistency{notes},
power{score, tempo, release_timing}, p1p9[], practicePlan[].
Personalize using meta (handed, eye, height, handicap).
No prose. JSON only.
  `.trim();

  const user = `
Base swing report (subset):
${JSON.stringify({
  meta: baseReport.meta || {},
  power: baseReport.power || { score: baseReport.swingScore ?? 80 },
  p1p9: baseReport.p1p9 || [],
  faults: baseReport.faults || [],
  note: baseReport.note || ""
}, null, 2)}
  `.trim();

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`OpenAI ${r.status}: ${txt.slice(0, 200)}`);
  }
  const j = await r.json();
  const raw = j?.choices?.[0]?.message?.content || "{}";
  return safeJson(raw);
}

function pct(n) {
  if (n == null) return undefined;
  const v = +n;
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : undefined;
}

/* ----------------- handler ----------------- */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = safeJson(req.body);

    const id = makeId();
    const key = `reports/${id}.json`;

    // Base report we’ll save first (so the viewer has *something*)
    const baseReport = {
      schema: "1.0",
      created: nowIso(),
      status: body.status ?? "ready",
      swingScore: body.swingScore ?? 80,
      power: body.power ?? { score: body.swingScore ?? 80, tempo: "—", release_timing: 0 },
      muxPlaybackId: body.muxPlaybackId ?? null,
      muxUploadId: body.muxUploadId ?? null,
      p1p9: Array.isArray(body.p1p9) ? body.p1p9 : [],
      faults: Array.isArray(body.faults) ? body.faults : [],
      note: body.note || "",
      meta: body.meta || {},

      topPriorityFixes: body.topPriorityFixes || [],
      topPowerFixes: body.topPowerFixes || [],
      positionConsistency: body.positionConsistency || null,
      swingConsistency: body.swingConsistency || null,
      practicePlan: body.practicePlan || [],
    };

    // 1) write base
    const firstPut = await put(key, JSON.stringify(baseReport, null, 2), {
      access: "public",
      contentType: "application/json",
    });

    let combined = { ...baseReport };
    let enhanced = false;
    let reason = "";

    // 2) Try LLM via internal route, then fallback to OpenAI inline
    const origin = inferOrigin(req);
    try {
      const enh = await callInternalEnhancer(origin, baseReport);
      if (enh && typeof enh === "object") {
        // merge known fields
        if (Array.isArray(enh.topPriorityFixes)) combined.topPriorityFixes = enh.topPriorityFixes;
        if (Array.isArray(enh.topPowerFixes)) combined.topPowerFixes = enh.topPowerFixes;
        if (enh.positionConsistency) combined.positionConsistency = enh.positionConsistency;
        if (enh.swingConsistency) combined.swingConsistency = enh.swingConsistency;
        if (enh.power) {
          combined.power = { ...(combined.power || {}), ...enh.power };
          const s = pct(enh.power.score);
          if (typeof s === "number") combined.swingScore = s;
        }
        if (Array.isArray(enh.p1p9) && enh.p1p9.length) combined.p1p9 = enh.p1p9;
        if (Array.isArray(enh.practicePlan)) combined.practicePlan = enh.practicePlan;
        enhanced = true;
      }
    } catch (e) {
      reason = `internal enhancer failed: ${e?.message || e}`;
      try {
        const enh2 = await callOpenAIInline(baseReport);
        if (enh2 && typeof enh2 === "object") {
          if (Array.isArray(enh2.topPriorityFixes)) combined.topPriorityFixes = enh2.topPriorityFixes;
          if (Array.isArray(enh2.topPowerFixes)) combined.topPowerFixes = enh2.topPowerFixes;
          if (enh2.positionConsistency) combined.positionConsistency = enh2.positionConsistency;
          if (enh2.swingConsistency) combined.swingConsistency = enh2.swingConsistency;
          if (enh2.power) {
            combined.power = { ...(combined.power || {}), ...enh2.power };
            const s = pct(enh2.power.score);
            if (typeof s === "number") combined.swingScore = s;
          }
          if (Array.isArray(enh2.p1p9) && enh2.p1p9.length) combined.p1p9 = enh2.p1p9;
          if (Array.isArray(enh2.practicePlan)) combined.practicePlan = enh2.practicePlan;
          enhanced = true;
        }
      } catch (ee) {
        // still proceed with base report
        if (!reason) reason = "openai inline failed";
        reason += `; ${ee?.message || ee}`;
      }
    }

    // 3) overwrite with final
    await put(key, JSON.stringify(combined, null, 2), {
      access: "public",
      contentType: "application/json",
    });

    return res.status(200).json({
      id,
      url: firstPut.url,
      enhanced,
      ...(reason ? { reason } : {}),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: String(e?.message || e),
      hint:
        "Verify OPENAI_API_KEY and BLOB_READ_WRITE_TOKEN. Also ensure /api/generate-report-llm exists.",
    });
  }
}
