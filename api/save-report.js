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
const nowIso = () => new Date().toISOString();
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const BLOB_BASE =
  process.env.BLOB_PUBLIC_BASE ||
  "https://yw0bpv5czlbqowjq.public.blob.vercel-storage.com";

function blobPublicUrlForKey(key) {
  const base = BLOB_BASE.replace(/\/+$/, "");
  return `${base}/${encodeURIComponent(key)}`;
}

async function callLLMEnhancerOnSameHost(req, baseReport) {
  // build absolute URL from the live request (works on Vercel + localhost)
  const proto =
    req.headers["x-forwarded-proto"]?.toString() ||
    (req.socket?.encrypted ? "https" : "http");
  const host = req.headers.host;
  if (!host) throw new Error("Missing request host header");
  const url = `${proto}://${host}/api/generate-report-llm`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ report: baseReport }),
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`LLM enhancer ${r.status}: ${txt.slice(0, 160)}`);
  }
  return await r.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = safeJson(req.body);
    const id = makeId();
    const key = `reports/${id}.json`;

    // Base (always valid, so viewer can open even if LLM fails)
    const baseReport = {
      schema: "1.0",
      created: nowIso(),
      status: body.status ?? "ready",
      swingScore: body.swingScore ?? 80,
      power: body.power ?? {
        score: body.swingScore ?? 80,
        tempo: body?.meta?.tempo || "—",
        release_timing: 0,
      },
      muxPlaybackId: body.muxPlaybackId ?? null,
      muxUploadId: body.muxUploadId ?? null,
      p1p9: Array.isArray(body.p1p9) ? body.p1p9 : [],
      faults: Array.isArray(body.faults) ? body.faults : [],
      note: body.note || "",
      meta: body.meta || {},

      // optional / to be enhanced:
      topPriorityFixes: body.topPriorityFixes || [],
      topPowerFixes: body.topPowerFixes || [],
      positionConsistency: body.positionConsistency || null,
      swingConsistency: body.swingConsistency || null,
      practicePlan: body.practicePlan || [],
    };

    // 1) Write base
    const putRes1 = await put(key, JSON.stringify(baseReport, null, 2), {
      access: "public",
      contentType: "application/json",
    });

    // 2) Enhance (non-fatal)
    let combined = { ...baseReport };
    let enhanced = false;
    try {
      const enh = await callLLMEnhancerOnSameHost(req, baseReport);

      if (Array.isArray(enh.topPriorityFixes)) combined.topPriorityFixes = enh.topPriorityFixes;
      if (Array.isArray(enh.topPowerFixes)) combined.topPowerFixes = enh.topPowerFixes;

      if (enh.positionConsistency) combined.positionConsistency = enh.positionConsistency;
      if (enh.swingConsistency) combined.swingConsistency = enh.swingConsistency;

      if (enh.power) {
        combined.power = { ...(combined.power || {}), ...enh.power };
        if (typeof enh.power.score === "number") combined.swingScore = enh.power.score;
      }
      if (Array.isArray(enh.p1p9) && enh.p1p9.length) combined.p1p9 = enh.p1p9;
      if (Array.isArray(enh.practicePlan)) combined.practicePlan = enh.practicePlan;

      enhanced = true;
    } catch (err) {
      console.error("LLM enhancement failed:", err?.message || err);
    }

    // 3) Overwrite with final version
    await put(key, JSON.stringify(combined, null, 2), {
      access: "public",
      contentType: "application/json",
    });

    return res.status(200).json({
      id,
      url: putRes1.url || blobPublicUrlForKey(key),
      enhanced,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: String(e?.message || e),
      hint: "Check OPENAI_API_KEY, BLOB_READ_WRITE_TOKEN. See function logs.",
    });
  }
}
