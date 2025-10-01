// pages/api/make-report.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-1";
const BUCKET = process.env.S3_BUCKET!;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function sampleCoachOut() {
  return {
    summary: "Sample: P6 ~12° steep; face ~3° open through P7. We’ll shallow earlier and tidy face-to-path.",
    top_faults: [
      { code: "shaft_steep", why: "Handle high; shaft across trail forearm", evidence: ["P6 +12°", "handle high"] },
      { code: "face_to_path_open", why: "Face a bit open vs path", evidence: ["P7 +3° open"] },
    ],
    drills: [
      { id: "SplitGrip_P3P6", steps: ["Split hands 2 in", "Slow P3→P6 keeping handle low-left"], reps: "3x10", cue: "handle low/left", contra: [] },
      { id: "LeadArmWall", steps: ["Lead side near wall", "Backswing: avoid wall; shallow first"], reps: "2x8", cue: "lead hip clears", contra: [] },
    ],
    practice_plan: { days: 14, schedule: Array.from({ length: 14 }, (_, i) => ({ day: i + 1, focus: ["P6 shallow", "face control"] })) },
    one_liner: "Crack the whip earlier; stop throwing the handle.",
  };
}

function toLegacyReportSchema(coachOut: any) {
  const fundamentals_top3 = [
    { label: "Shallow earlier (P3→P6)", delta: null, units: "deg" },
    { label: "Handle low/left through P6", delta: null, units: "deg" },
    { label: "Match face to path at P7", delta: null, units: "deg" },
  ];
  const power_errors_top3 = (coachOut.top_faults || []).slice(0, 3).map((f: any) => ({
    label: (f.code || "").replace(/_/g, " "),
    evidence: f.evidence || [],
  }));
  const quick_fixes_top3 = (coachOut.drills || []).slice(0, 3).map((d: any) => ({ label: d.cue || d.id }));

  return {
    header: { date: new Date().toISOString().slice(0, 10), mode: "Full Swing", swings: 8 },
    summary: coachOut.summary,
    p1p9: [
      { p: "P6", note: "Shaft steep; handle high" },
      { p: "P7", note: "Face a bit open vs path" },
    ],
    position_consistency: { overall: 74, by_position: [{ p: "P1", score: 82 }, { p: "P6", score: 63 }, { p: "P7", score: 70 }] },
    swing_consistency: { tempo: "3:1", variance: 6, stability: 82 },
    power_score_summary: { total: 68, components: [{ name: "Levers", score: 72 }, { name: "Sequence", score: 65 }, { name: "Release", score: 67 }] },
    fundamentals_top3, power_errors_top3, quick_fixes_top3,
    faults: coachOut.top_faults || [],
    drills: coachOut.drills || [],
    plan_14_day: (coachOut.practice_plan?.schedule || []).slice(0, 14),
  };
}

function addViewerAliases(legacy: any) {
  const v = JSON.parse(JSON.stringify(legacy));
  v.ok = true; v.status = "ready"; v.version = 1; v.generatedAt = new Date().toISOString();

  v.date = legacy.header?.date; v.mode = legacy.header?.mode || "Full Swing"; v.swings = legacy.header?.swings ?? 0;
  v.modeLabel = v.mode; v.swingCount = v.swings;

  v.positionConsistency = legacy.position_consistency;
  v.swingConsistency = legacy.swing_consistency;
  v.powerScoreSummary = legacy.power_score_summary;
  v.top3Fundamentals = legacy.fundamentals_top3;
  v.top3PowerErrors = legacy.power_errors_top3;
  v.top3QuickFixes = legacy.quick_fixes_top3;
  v.fourteenDayPlan = legacy.plan_14_day;
  v.practicePlan = legacy.plan_14_day;
  v.p1ToP9 = legacy.p1p9;

  v.top_3_fundamentals = legacy.fundamentals_top3;
  v.top_3_power_errors = legacy.power_errors_top3;
  v.top_3_quick_fixes = legacy.quick_fixes_top3;

  if (v.powerScoreSummary && v.powerScoreSummary.value == null && v.powerScoreSummary.total != null) {
    v.powerScoreSummary.value = v.powerScoreSummary.total;
  }
  if (!v.power && v.powerScoreSummary?.value != null) v.power = { score: v.powerScoreSummary.value };
  v.practice_plan = legacy.plan_14_day;
  v.drills = (legacy.drills || []).map((d: any) => ({ title: d.id, ...d }));

  return v;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const facts = (req.body?.facts ?? req.body ?? {}) as any;

  // Run the coach
  let coachOut: any;
  if (!process.env.OPENAI_API_KEY) {
    coachOut = sampleCoachOut();
  } else {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const system =
        "You are Virtual Coach AI. Be direct, supportive, biomechanically precise. Return VALID JSON with keys {summary, top_faults, drills, practice_plan, one_liner}. Max 2 drills per fault.";
      const resp = await client.responses.create({
        model: process.env.VCAI_MODEL_REASON || "gpt-4.1-mini",
        input: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(facts) }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "VCAI_CoachOut",
            schema: {
              type: "object",
              required: ["summary", "top_faults", "drills", "practice_plan", "one_liner"],
              properties: {
                summary: { type: "string" },
                top_faults: { type: "array", items: { type: "object" } },
                drills: { type: "array", items: { type: "object" } },
                practice_plan: { type: "object" },
                one_liner: { type: "string" },
              },
            },
          },
        },
        temperature: 0.3,
      });
      coachOut = JSON.parse(resp.output_text ?? "{}");
    } catch (e) {
      console.warn("OpenAI failed -> offline sample", (e as any)?.message);
      coachOut = sampleCoachOut();
    }
  }

  const viewer = addViewerAliases(toLegacyReportSchema(coachOut));

  // Save report JSON to S3 and return a signed GET link for the viewer
  const id = new Date().toISOString().replace(/[-:.TZ]/g, "") + "-" + Math.random().toString(16).slice(2, 8);
  const Key = `reports/${id}.json`;
  const Body = JSON.stringify(viewer, null, 2);

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key,
    Body,
    ContentType: "application/json; charset=utf-8",
  }));

  const signed = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key }), { expiresIn: 7 * 24 * 3600 });
  // The viewer accepts any absolute URL in ?report=
  res.status(200).json({ ok: true, id, key: Key, url: signed, viewerUrl: `/report/?report=${encodeURIComponent(signed)}` });
}
