
    // --- VCA_P3P7_SUMMARY_INJECT (SAFE) ---
    try {
      if (report && report.summary) {
        const p3p7 = (report as any).p3p7;
        const conf = p3p7?.confidence;
        const pf = p3p7?.phaseFrames;
        if (!report.summary.p3p7_summary && conf && pf) {
          report.summary.p3p7_summary = {
            phaseFrames: pf,
            shaftPlane: {
              level: conf.shaft_plane?.level ?? "ESTIMATED",
              score01: conf.shaft_plane?.score01 ?? 0
            },
            wristDelivery: {
              level: conf.wrist_delivery?.level ?? "ESTIMATED",
              score01: conf.wrist_delivery?.score01 ?? 0
            }
          };
        }
      }
    } catch {}
    // --- /VCA_P3P7_SUMMARY_INJECT (SAFE) ---
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";

type AnyObj = any;

function sanitizeText(s: string): string {
  // Replace box-drawing garbage with ASCII
  // U+251C, U+2524
  return s.replace(/\u251C/g, "-").replace(/\u2524/g, "-");
}

function sanitizeAnyInPlace(x: AnyObj): AnyObj {
  if (x == null) return x;
  if (typeof x === "string") return sanitizeText(x);
  if (Array.isArray(x)) {
    for (let i = 0; i < x.length; i++) x[i] = sanitizeAnyInPlace(x[i]);
    return x;
  }
  if (typeof x === "object") {
    for (const k of Object.keys(x)) (x as AnyObj)[k] = sanitizeAnyInPlace((x as AnyObj)[k]);
    return x;
  }
  return x;
}

async function readJson(p: string) {
  const txt = await readFile(p, "utf8");
  return JSON.parse(txt);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const wantBundle = url.searchParams.get("bundle") === "1";

    // Windows dev: read from the known latest folder
    const latestDir = "E:\\VCA\\_runs\\demoSafe\\latest";
    const manifestPath = path.join(latestDir, "latest_manifest.json");
    const manifest = await readJson(manifestPath);

    let bundle: AnyObj = undefined;
    if (wantBundle) {
      const files = manifest?.files || {};
      // Files may be relative; resolve to latestDir
      async function loadMaybe(key: string) {
        const rel = files[key];
        if (!rel) return undefined;
        const p = path.isAbsolute(rel) ? rel : path.join(latestDir, rel);
        return await readJson(p);
      }

      bundle = {
        rankedFaults: await loadMaybe("rankedFaults"),
        pretty: await loadMaybe("pretty"),
        summary: await loadMaybe("summary"),
        deliveryCard: await loadMaybe("deliveryCard"),
        captureFix: await loadMaybe("captureFix"),
        p3p5Mirror: await loadMaybe("p3p5Mirror"),
        p5p6p7ShaftArm: await loadMaybe("p5p6p7ShaftArm"),
        foWristHandle: await loadMaybe("foWristHandle"),
      };
    
    // FORCE sanitize drills (belt + suspenders)
    try {
      const rf = bundle?.rankedFaults;
      if (Array.isArray(rf)) {
        for (const f of rf) {
          if (f && Array.isArray(f.drills)) {
            f.drills = f.drills.map((s: any) => (typeof s === "string" ? sanitizeText(s) : s));
          }
          if (f && typeof f.meaning === "string") f.meaning = sanitizeText(f.meaning);
          if (f && typeof f.label === "string") f.label = sanitizeText(f.label);
        }
      }
    } catch {}
}

    const payload: AnyObj = {
      ok: true,
      manifest,
      bundle,
      debug: {
        latestDir,
        manifestPath,
        wantBundle,
      },
    };

    sanitizeAnyInPlace(payload);     // FINAL GUARANTEE: sanitize at JSON string level (prevents any weird unicode from leaking)
    let json = JSON.stringify(payload);
    json = json.replace(/\u251C/g, "-").replace(/\u2524/g, "-");

    return new Response(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
} catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
