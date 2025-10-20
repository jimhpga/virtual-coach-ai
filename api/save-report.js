// api/save-report.js
export const config = { runtime: "nodejs" };

import { put } from "@vercel/blob";

function safeJson(input) {
  try {
    if (!input) return {};
    if (typeof input === "string") return JSON.parse(input);
    return input;
  } catch {
    return {};
  }
}

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const BLOB_BASE =
  process.env.BLOB_PUBLIC_BASE ||
  "https://yw0bpv5czlbqowjq.public.blob.vercel-storage.com";

function blobPublicUrlForKey(key) {
  // put() returns the public URL, but computing it here helps us re-put with the same key
  const base = BLOB_BASE.replace(/\/+$/, "");
  return `${base}/${encodeURIComponent(key)}`;
}

async function callLLMEnhancer(baseReport) {
  // Call our own LLM endpoint to enhance the base report
  const origin =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const r = await fetch(`${origin}/api/generate-report-llm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ report: baseReport }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      throw new Error(`LLM enhancer ${r.status}: ${txt.slice(0, 160)}`);
    }
    return await r.json();
  } catch (e) {
    clearTimeout(timeout);
    // Bubble up; caller can decide to continue without enhancements
    throw e;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = safeJson(req.body);

    const id = makeId();
    const key = `reports/${id}.json`;

    // Minimal base report we persist first
    const baseReport = {
      schema: "1.0",
      created: nowIso(),
      status: body.status ?? "ready",
      swingScore: body.swingScore ?? 80,
      power: body.power ?? { score: body.swingScore ?? 80, tempo: "—", release_timing: 0 },
      muxPlaybackId: body.muxPlaybackId ?? null,
      muxUploadId: body.muxUploadId ?? null,
      p1p9: Array.isArray(body.p1p9) ? body.p1p9 : [],         // can be empty; LLM can fill
      faults: Array.isArray(body.faults) ? body.faults : [],
      note: body.note || "",
      meta: body.meta || {},
      // placeholders LLM may fill:
      topPriorityFixes: body.topPriorityFixes || [],
      topPowerFixes: body.topPowerFixes || [],
      positionConsistency: body.positionConsistency || null,
      swingConsistency: body.swingConsistency || null,
      practicePlan: body.practicePlan || [],
    };

    // 1) Write the base report to Blob right away (so the viewer can load something)
    const putRes1 = await put(key, JSON.stringify(baseReport, null, 2), {
      access: "public",
      contentType: "application/json",
    });

    let enhanced = false;
    let combined = { ...baseReport };

    // 2) Try to enhance via LLM (best effort — if it fails we still return the base)
    try {
      const enh = await callLLMEnhancer(baseReport);

      // Merge *only* known enhanced fields to avoid clobbering base properties
      if (Array.isArray(enh.topPriorityFixes)) combined.topPriorityFixes = enh.topPriorityFixes;
      if (Array.isArray(enh.topPowerFixes)) combined.topPowerFixes = enh.topPowerFixes;

      if (enh.positionConsistency) combined.positionConsistency = enh.positionConsistency;
      if (enh.swingConsistency) combined.swingConsistency = enh.swingConsistency;

      if (enh.power) {
        combined.power = { ...(combined.power || {}), ...enh.power };
        if (typeof enh.power.score === "number") combined.swingScore = enh.power.score;
      }

      if (Array.isArray(enh.p1p9) && enh.p1p9.length) {
        combined.p1p9 = enh.p1p9;
      }

      if (Array.isArray(enh.practicePlan)) {
        combined.practicePlan = enh.practicePlan;
      }

      enhanced = true;
    } catch (e) {
      // Not fatal — we’ll keep the base
      console.error("LLM enhancement failed:", e?.message || e);
    }

    // 3) Write the final (enhanced or base) to the same Blob key
    await put(key, JSON.stringify(combined, null, 2), {
      access: "public",
      contentType: "application/json",
      // put() with the same key overwrites
    });

    // Return the public URL (from first put is fine; same key)
    return res.status(200).json({
      id,
      url: putRes1.url || blobPublicUrlForKey(key),
      enhanced,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: String(e?.message || e),
      hint:
        "Check BLOB_READ_WRITE_TOKEN / OPENAI_API_KEY and that /api/generate-report-llm is deployed.",
    });
  }
}
