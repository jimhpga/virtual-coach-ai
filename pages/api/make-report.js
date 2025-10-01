// pages/api/make-report.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function sampleCoachOut() {
  return {
    summary: "Sample: P6 ~12° steep; face ~3° open through P7. We’ll shallow earlier and tidy face-to-path.",
    top_faults: [
      { code: "shaft_steep",       why: "Handle high; shaft across trail forearm", evidence: ["P6 +12°", "handle high"] },
      { code: "face_to_path_open", why: "Face a bit open vs path",                  evidence: ["P7 +3° open"] }
    ],
    drills: [
      { id:"SplitGrip_P3P6", steps:["Split hands 2 in","Slow P3→P6 keeping handle low-left"], reps:"3x10", cue:"handle low/left", contra:[] },
      { id:"LeadArmWall",    steps:["Lead side near wall","Backswing: avoid wall; shallow first"], reps:"2x8", cue:"lead hip clears", contra:[] }
    ],
    practice_plan: { days:14, schedule:Array.from({length:14},(_,i)=>({day:i+1,focus:["P6 shallow","face control"]})) },
    one_liner:"Crack the whip earlier; stop throwing the handle."
  };
}

function toLegacyReportSchema(coachOut) {
  const fundamentals_top3 = [
    { label:"Shallow earlier (P3→P6)",   delta:null, units:"deg" },
    { label:"Handle low/left through P6",delta:null, units:"deg" },
    { label:"Match face to path at P7",  delta:null, units:"deg" }
  ];
  const power_errors_top3 = (coachOut.top_faults||[]).slice(0,3).map(f=>({
    label:(f.code||"").replace(/_/g," "), evidence:f.evidence||[]
  }));
  const quick_fixes_top3 = (coachOut.drills||[]).slice(0,3).map(d=>({ label:d.cue||d.id }));

  return {
    header:{ date:new Date().toISOString().slice(0,10), mode:"Full Swing", swings:8 },
    summary: coachOut.summary,
    p1p9: [
      { p:"P6", note:"Shaft steep; handle high" },
      { p:"P7", note:"Face a bit open vs path" }
    ],
    position_consistency:{ overall:74, by_position:[{p:"P1",score:82},{p:"P6",score:63},{p:"P7",score:70}] },
    swing_consistency:{ tempo:"3:1", variance:6, stability:82 },
    power_score_summary:{ total:68, components:[{name:"Levers",score:72},{name:"Sequence",score:65},{name:"Release",score:67}] },
    fundamentals_top3, power_errors_top3, quick_fixes_top3,
    faults: coachOut.top_faults || [],
    drills: coachOut.drills || [],
    plan_14_day: (coachOut.practice_plan?.schedule||[]).slice(0,14)
  };
}

function addViewerAliases(legacy) {
  const v = JSON.parse(JSON.stringify(legacy));
  v.ok = true; v.status = "ready"; v.version = 1; v.generatedAt = new Date().toISOString();
  v.date   = legacy.header?.date; v.mode = legacy.header?.mode || "Full Swing"; v.swings = legacy.header?.swings ?? 0;
  v.modeLabel  = v.mode; v.swingCount = v.swings;
  v.positionConsistency = legacy.position_consistency;
  v.swingConsistency    = legacy.swing_consistency;
  v.powerScoreSummary   = legacy.power_score_summary;
  v.top3Fundamentals    = legacy.fundamentals_top3;
  v.top3PowerErrors     = legacy.power_errors_top3;
  v.top3QuickFixes      = legacy.quick_fixes_top3;
  v.fourteenDayPlan     = legacy.plan_14_day;
  v.practicePlan        = legacy.plan_14_day;
  v.p1ToP9              = legacy.p1p9;
  v.top_3_fundamentals  = legacy.fundamentals_top3;
  v.top_3_power_errors  = legacy.power_errors_top3;
  v.top_3_quick_fixes   = legacy.quick_fixes_top3;
  v.practice_plan       = legacy.plan_14_day;
  v.drills              = (legacy.drills||[]).map(d=>({ title:d.id, ...d }));

  if (v.powerScoreSummary && v.powerScoreSummary.value == null && v.powerScoreSummary.total != null) {
    v.powerScoreSummary.value = v.powerScoreSummary.total;
  }
  if (!v.power && v.powerScoreSummary?.value != null) v.power = { score: v.powerScoreSummary.value };
  return v;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok:false, error:"Method not allowed" });
  }

  try {
    const { S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, OPENAI_API_KEY } = process.env;
    if (!S3_BUCKET || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      return res.status(500).json({ ok:false, error:"Missing AWS env" });
    }
    const Region = AWS_REGION || "us-west-1";

    // In prod you can call OpenAI here; use sample offline if no key
    let coachOut = sampleCoachOut();

    // (If you want: read req.body.facts and feed OpenAI to personalize)
    // const facts = req.body?.facts ?? {};
    // if (OPENAI_API_KEY) { ... }

    const legacy = toLegacyReportSchema(coachOut);
    const viewer = addViewerAliases(legacy);

    const id  = new Date().toISOString().replace(/[-:.TZ]/g,"") + "-" + Math.random().toString(16).slice(2,8);
    const Key = `reports/${id}.json`;

    const s3 = new S3Client({ region: Region, credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY
    }});

    const Body = Buffer.from(JSON.stringify(viewer, null, 2), "utf8");
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET, Key, Body,
      ContentType: "application/json; charset=utf-8",
      CacheControl: "no-store"
    }));

    // Public S3 URL (works with your viewer since it accepts full URLs)
    const s3Url = `https://${S3_BUCKET}.s3.${Region}.amazonaws.com/${Key}`;
    const viewUrl = `/report/?report=${encodeURIComponent(s3Url)}`;

    return res.status(200).json({ ok:true, id, url: viewUrl });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e?.message || "make-report failed" });
  }
}
