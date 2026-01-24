import { NextResponse } from "next/server";
import { applyDeterministicCoaching } from "../../lib/deterministicCoach";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const DEMO_TOP_FAULTS = [
  {
    key: "clubface_control",
    score: 60,
    label: "Clubface control (impact)",
    note: "Demo fallback",
    meaning: "Face-to-path is drifting — start line control suffers.",
    drills: [
      "9-to-3 punch shots: half swings, hold the face square through impact.",
      "Alignment stick gate: start the ball through a narrow start-line window."
    ]
  },
  {
    key: "low_point_control",
    score: 55,
    label: "Low point control (strike)",
    note: "Demo fallback",
    meaning: "Bottom of arc is inconsistent — contact and compression vary.",
    drills: [
      "Towel drill: place towel 4–6\" behind ball; miss towel, hit ball first.",
      "Line drill: draw a line, ball just ahead; strike the line in front every rep."
    ]
  },
  {
    key: "sequence_timing",
    score: 50,
    label: "Sequence timing (transition)",
    note: "Demo fallback",
    meaning: "Body/arms aren’t syncing — speed leaks and face gets flippy.",
    drills: [
      "Step-through drill: small step toward target to trigger pressure shift then turn.",
      "Pump drill (3 pumps): rehearse P5 slot, then swing through without flipping."
    ]
  }
];

async function __persistJob(jobId: string, payload: any) {
  try {
    if (!jobId) return;
    if (process.env.NODE_ENV === "production") return;

    // Primary job store used by /api/job/[id]
    const jobsDir = path.join(process.cwd(), ".vca", "jobs");
    await mkdir(jobsDir, { recursive: true });
    const p = path.join(jobsDir, `${jobId}.json`);
    await writeFile(p, JSON.stringify(payload, null, 2), "utf8");
  } catch {}
}
async function __vcaDump(tag: string, payload: any) {
  try {
    if (process.env.NODE_ENV === "production") return;

    const jobId =
      payload?.id ??
      payload?.jobId ??
      payload?.job?.id ??
      payload?.data?.id ??
      `dev_${Date.now()}`;

    const dir = path.join(process.cwd(), ".data", "jobs", String(jobId));
    await mkdir(dir, { recursive: true });

    const write = async (name: string, obj: any) => {
      if (obj === undefined) return;
      const p = path.join(dir, name);
      await writeFile(p, JSON.stringify(obj, null, 2), "utf8");
    };

    await write("response.json", payload);
    await write(`${tag}.json`, payload);

    // Optional common keys (if present)
    await write("ai_raw.json", payload?.ai_raw ?? payload?.aiRaw ?? payload?.raw ?? payload?.model_raw);
    await write("ai_parsed.json", payload?.ai_parsed ?? payload?.aiParsed ?? payload?.parsed ?? payload?.model_parsed);
    await write("ai_summary.json", payload?.ai_summary ?? payload?.aiSummary ?? payload?.summary ?? payload?.report);
  } catch {}
}

function __normalizeReport(report: any) {
  try {
    if (!report || typeof report !== "object") return report;
    report.headline = String(report.headline || "P1-P9 frames ready.").replace(/P1[ÃƒÆ’Ã†’Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†’Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢]P9/g, "P1-P9");
    if (!Array.isArray(report.topFaults)) report.topFaults = [];
    return report;
  } catch { return report; }
}

export const runtime = "nodejs";

type ExtractResp = {
  ok: boolean;
  jobId?: string;
  videoUrl?: string;
  framesDir?: string; // "/frames/<jobId>"
  frames?: Array<{ p: number; label: string; file: string; url: string }>;
  error?: string;
};

export async function POST(req: Request) {
  const __dbgId = `dev_${Date.now()}`;
    let __dumpId = __dbgId;
let __dbgPayload: any = null;
let __dbgError: any = null;

  // Ensure jobId exists even if we fail before parsing body
  let jobId = `dev_${Date.now()}`;
  try {
    const body = await req.json().catch(() => ({}));
    jobId = String(body?.jobId || body?.uploadId || `dev_${Date.now()}`);
    const videoUrl = String(body?.videoUrl || "");
    const uploadId = String(body?.uploadId || "");

    const impactSec =
      (typeof body?.impactSec === "number" && body.impactSec > 0)
        ? body.impactSec
        : 2.5;

    const v = videoUrl || (uploadId ? `/uploads/${uploadId}` : "");

    if (!v || !v.startsWith("/uploads/")) {
      __dbgPayload = { ok: false, jobId, error: "videoUrl must start with /uploads/" };
      return NextResponse.json(__dbgPayload, { status: 400 });
    }

    const base = new URL(req.url).origin;

    // Call extract-pframes (creates /public/frames/<jobId>/p1..p9.jpg)
    const r = await fetch(`${base}/api/extract-pframes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoUrl: v, impactSec }),
    });

    const data = (await r.json().catch(() => null)) as ExtractResp | null;

    if (!r.ok || !data || !data.ok) {
      __dbgPayload = { ok: false, jobId, error: data?.error || `extract-pframes failed (${r.status})` };
      return NextResponse.json(__dbgPayload, { status: 500 });
    }

    const framesDir = data.framesDir || "";
const framesRaw = Array.isArray((data as any).frames) ? (data as any).frames : [];
    const frames = (framesRaw.length > 0)
      ? framesRaw
      : Array.from({ length: 9 }, (_, i) => {
          const p = i + 1;
          const file = `p${p}.jpg`;
          const url = `${framesDir}/${file}`;
          return { p, label: `P${p}`, file, url };
        });

    const pframes = frames
      .slice()
      .sort((a, b) => (a.p || 0) - (b.p || 0))
      .map((f) => ({
        p: f.p,
        label: f.label || `P${f.p}`,
        imageUrl: f.url,
        thumbUrl: f.url,
      }));
  // ---- VCA DISK FALLBACK (investor-proof) ----
  // If upstream returns empty frames/pframes, rebuild P1-P9 from public/framesDir.
  if ((!Array.isArray(pframes) || pframes.length === 0) && framesDir) {
    try {
      const pubFramesDir = path.join(
        process.cwd(),
        "public",
        String(framesDir || "").replace(/^\//, "")
      );
      const diskP: any[] = [];
      for (let p = 1; p <= 9; p++) {
        const file = "p" + String(p) + ".jpg";
        const abs = path.join(pubFramesDir, file);
        if (fs.existsSync(abs)) {
          diskP.push({ p: p, label: "P" + String(p), imageUrl: String(framesDir) + "/" + file });
        }
      }

      if (diskP.length >= 9) {
        pframes = diskP;
      }
} catch {}
  }
  // --------------------------------------------

    const report = {
      id: jobId,
      createdAt: new Date().toISOString(),
      headline: "P1-P9 frames ready.",
      swingScore: 72,
      topFaults: [],
      checkpoints: (Array.isArray(pframes) ? pframes : []).map((pf:any) => ({ p: pf.p, label: pf.label ?? `P${pf.p}`, note: "-" })),
      pframes,
      framesDir,
    } catch {}
    try {
    } catch {}


    // Finish-line guardrail: never show more than top 3 faults
const __tf = (report as any)?.topFaults;
(report as any).topFaults =
  Array.isArray(__tf) && __tf.length
    ? __tf.slice(0, 3).map((x: any, i: number) => ({
        key: String(x?.key ?? DEMO_TOP_FAULTS[i]?.key ?? `fault_${i}`),
        score: Number.isFinite(+x?.score) ? +x.score : DEMO_TOP_FAULTS[i].score,
        label: String(x?.label ?? DEMO_TOP_FAULTS[i].label),
        note: String(x?.note ?? ""),
        meaning: String(x?.meaning ?? DEMO_TOP_FAULTS[i].meaning),
        drills: Array.isArray(x?.drills) && x.drills.length ? x.drills.slice(0, 3) : DEMO_TOP_FAULTS[i].drills,
      }))
    : [...DEMO_TOP_FAULTS];
    applyDeterministicCoaching(report);
// MVP guardrail: cap drills to 2 (safe, targeted)
    try {
      const pl = (report as any)?.powerLeaks;
      if (Array.isArray(pl)) {
        for (const item of pl) {
          if (item && Array.isArray((item as any).drills)) {
            (item as any).drills = (item as any).drills.slice(0, 2);
          }
        }
      }
    } catch {}
// MVP guardrail: cap drills to 2 (safe, targeted)
    try {
      const pl = (report as any)?.powerLeaks;
      if (Array.isArray(pl)) {
        for (const item of pl) {
          if (item && Array.isArray((item as any).drills)) {
            (item as any).drills = (item as any).drills.slice(0, 2);
          }
        }
      }
    } catch {}
__normalizeReport(report);

    __dbgPayload = { ok: true, jobId,
      videoUrl: v,
      framesDir,
frames,
      report,
    };

    await __persistJob(jobId, __dbgPayload);
    return NextResponse.json(__dbgPayload);
  } catch (e: any) {
    __dbgError = { message: e?.message || "Analyze failed", stack: e?.stack };
    __dbgPayload = { ok: false, jobId, error: e?.message || "Analyze failed" };
    return NextResponse.json(__dbgPayload, { status: 500 });
  } finally {
    try {
      await __vcaDump("analyze", { id: __dumpId, ok: !!__dbgPayload?.ok, error: __dbgError, payload: __dbgPayload });
    } catch {}
  }
}





















