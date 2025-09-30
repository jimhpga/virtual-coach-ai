// server-api.mjs
import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import crypto from "crypto";

const PORT = process.env.PORT || 3000;
const app = express();

app.disable("x-powered-by");
app.use(bodyParser.json());

// ---- tiny request logger ----
app.use((req, _res, next) => { console.log(req.method, req.url); next(); });

// ---- paths ----
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const docsDir    = path.resolve(__dirname, "docs");
const reportDir  = path.resolve(__dirname, "docs", "report");   // viewer
const reportsDir = path.resolve(__dirname, "docs", "reports");  // data JSONs

await fs.mkdir(reportDir,  { recursive: true });
await fs.mkdir(reportsDir, { recursive: true });

// ---- static (order matters) ----
// Serve docs at site root so /assets, /css, /js resolve (but don't auto-index).
app.use(express.static(docsDir, { index: false, redirect: false }));

// Also expose under /docs explicitly.
app.use("/docs", express.static(docsDir));

// Serve JSON reports with NO cache (avoid stale/grey viewer loads).
app.use("/reports", express.static(reportsDir, {
  etag: false,
  maxAge: 0,
  setHeaders(res){ res.set("Cache-Control", "no-store"); }
}));

// Serve the viewer at /report. Make sure the HTML is never cached.
app.use("/report", express.static(reportDir, {
  index: "index.html",
  redirect: false,
  setHeaders(res, filePath) {
    // Don't cache HTML; assets can use defaults.
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-store");
    }
  }
}));
app.get("/report", (_req, res) =>
  res.sendFile(path.join(reportDir, "index.html"))
);
app.get(/^\/report\/.*$/, (_req, res) =>
  res.sendFile(path.join(reportDir, "index.html"))
);

// Convenience: /report/latest → viewer with latest.json
app.get("/report/latest", (_req, res) =>
  res.redirect("/report/?report=/reports/latest.json")
);

// Optional alias for a colocated report file
app.get("/report.json", (_req, res) =>
  res.sendFile(path.join(reportDir, "report.json"), {
    headers: { "Cache-Control": "no-store" }
  })
);

// Landing (change if you prefer)
app.get("/", (_req, res) => res.redirect("/docs/demo.html"));

// ---- health / mode ----
app.get("/api/ping", (_req, res) =>
  res.status(200).json({ ok: true, time: new Date().toISOString() })
);
app.get("/api/mode", (_req, res) =>
  res.json({ mode: process.env.OPENAI_API_KEY ? "live" : "offline" })
);

// ---------- sample output used offline ----------
function sampleCoachOut(){
  return {
    summary: "Sample: P6 ~12° steep; face ~3° open through P7. We’ll shallow earlier and tidy face-to-path.",
    top_faults: [
      { code:"shaft_steep",       why:"Handle high; shaft across trail forearm", evidence:["P6 +12°","handle high"] },
      { code:"face_to_path_open", why:"Face a bit open vs path",                  evidence:["P7 +3° open"] }
    ],
    drills: [
      { id:"SplitGrip_P3P6", steps:["Split hands 2 in","Slow P3→P6 keeping handle low-left"], reps:"3x10", cue:"handle low/left", contra:[] },
      { id:"LeadArmWall",    steps:["Lead side near wall","Backswing: avoid wall; shallow first"], reps:"2x8", cue:"lead hip clears", contra:[] }
    ],
    practice_plan: { days:14, schedule:Array.from({length:14},(_,i)=>({day:i+1,focus:["P6 shallow","face control"]})) },
    one_liner:"Crack the whip earlier; stop throwing the handle."
  };
}

// ---------- /api/coach ----------
app.post("/api/coach", async (req,res)=>{
  try{
    const facts = req.body || {};
    let out;

    if(!process.env.OPENAI_API_KEY){
      out = sampleCoachOut();
    }else{
      try{
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const system = "You are Virtual Coach AI. Be direct, supportive, biomechanically precise. Return VALID JSON with keys {summary, top_faults, drills, practice_plan, one_liner}. Max 2 drills per fault.";
        const resp = await client.responses.create({
          model: process.env.VCAI_MODEL_REASON || "gpt-4.1-mini",
          input: [
            {role:"system", content: system},
            {role:"user",   content: JSON.stringify(facts)}
          ],
          response_format:{
            type:"json_schema",
            json_schema:{
              name:"VCAI_CoachOut",
              schema:{
                type:"object",
                required:["summary","top_faults","drills","practice_plan","one_liner"],
                properties:{
                  summary:{type:"string"},
                  top_faults:{type:"array",items:{type:"object",required:["code","why","evidence"]}},
                  drills:{type:"array",items:{type:"object",required:["id","steps","reps","cue"]}},
                  practice_plan:{type:"object",required:["days","schedule"]},
                  one_liner:{type:"string"}
                }
              }
            }
          },
          temperature:0.3
        });
        out = JSON.parse(resp.output_text ?? "{}");
      }catch(err){
        console.warn("[VCAI]/api/coach OpenAI failed → offline:", err?.message);
        out = sampleCoachOut();
      }
    }
    res.status(200).json(out);
  }catch(e){
    res.status(500).json({ error:e?.message || "coach failed" });
  }
});

// ---------- canonical → viewer schema ----------
function toLegacyReportSchema(coachOut){
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

// ---------- aliases the viewer expects ----------
function addViewerAliases(legacy){
  const v = JSON.parse(JSON.stringify(legacy)); // deep clone

  // meta / ready flags
  v.ok = true;
  v.status = "ready";
  v.version = 1;
  v.generatedAt = new Date().toISOString();

  // header mirrors
  v.date   = legacy.header?.date;
  v.mode   = legacy.header?.mode || "Full Swing";
  v.swings = legacy.header?.swings ?? 0;

  // REQUIRED by header UI
  v.modeLabel  = v.mode;
  v.swingCount = v.swings;

  // camelCase mirrors
  v.positionConsistency = legacy.position_consistency;
  v.swingConsistency    = legacy.swing_consistency;
  v.powerScoreSummary   = legacy.power_score_summary;
  v.top3Fundamentals    = legacy.fundamentals_top3;
  v.top3PowerErrors     = legacy.power_errors_top3;
  v.top3QuickFixes      = legacy.quick_fixes_top3;
  v.fourteenDayPlan     = legacy.plan_14_day;
  v.practicePlan        = legacy.plan_14_day;
  v.p1ToP9              = legacy.p1p9;

  // snake_case mirrors (older code paths)
  v.top_3_fundamentals  = legacy.fundamentals_top3;
  v.top_3_power_errors  = legacy.power_errors_top3;
  v.top_3_quick_fixes   = legacy.quick_fixes_top3;

  // sometimes expected at top-level as “practice_plan”
  v.practice_plan = legacy.plan_14_day;

  // drill card title
  v.drills = (legacy.drills||[]).map(d=>({ title:d.id, ...d }));

  // ensure a powerScoreSummary.value exists (mirror from total)
  if (v.powerScoreSummary) {
    if (v.powerScoreSummary.value == null && v.powerScoreSummary.total != null) {
      v.powerScoreSummary.value = v.powerScoreSummary.total;
    }
  }
  // flat "power.score" for legacy snippets
  if (!v.power && v.powerScoreSummary?.value != null) {
    v.power = { score: v.powerScoreSummary.value };
  }

  return v;
}

// ---------- create + save report JSON ----------
app.post("/api/make-report", async (req,res)=>{
  try{
    const facts = req.body?.facts ?? req.body ?? {};
    let coachOut;

    if(!process.env.OPENAI_API_KEY){
      coachOut = sampleCoachOut();
    }else{
      try{
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const system = "You are Virtual Coach AI. Be direct, supportive, biomechanically precise. Return VALID JSON with keys {summary, top_faults, drills, practice_plan, one_liner}. Max 2 drills per fault.";
        const resp = await client.responses.create({
          model: process.env.VCAI_MODEL_REASON || "gpt-4.1-mini",
          input: [
            {role:"system", content: system},
            {role:"user",   content: JSON.stringify(facts)}
          ],
          response_format:{ type:"json_schema", json_schema:{ name:"VCAI_CoachOut", schema:{
            type:"object", required:["summary","top_faults","drills","practice_plan","one_liner"],
            properties:{
              summary:{type:"string"},
              top_faults:{type:"array",items:{type:"object"}},
              drills:{type:"array",items:{type:"object"}},
              practice_plan:{type:"object"},
              one_liner:{type:"string"}
            }
          }}},
          temperature:0.3
        });
        coachOut = JSON.parse(resp.output_text ?? "{}");
      }catch(err){
        console.warn("[VCAI]/api/make-report OpenAI failed → offline:", err?.message);
        coachOut = sampleCoachOut();
      }
    }

    const legacy = toLegacyReportSchema(coachOut);
    const viewer = addViewerAliases(legacy);

    const id         = new Date().toISOString().replace(/[-:.TZ]/g,"") + "-" + crypto.randomBytes(3).toString("hex");
    const fileMain   = path.join(reportsDir, `${id}.json`);
    const fileLatest = path.join(reportsDir, `latest.json`);
    const fileLocal  = path.join(reportDir,  `report.json`);
    const blob = JSON.stringify(viewer, null, 2);

    await fs.writeFile(fileMain,   blob, "utf8");
    await fs.writeFile(fileLatest, blob, "utf8");
    await fs.writeFile(fileLocal,  blob, "utf8");

    res.status(200).json({ ok:true, url:`/report/?report=/reports/${id}.json`, id });
  }catch(e){
    res.status(500).json({ ok:false, error:e?.message || "make-report failed" });
  }
});

// quick peek endpoint
app.get("/api/report/latest", async (_req,res)=>{
  try{
    const j = await fs.readFile(path.join(reportsDir,"latest.json"),"utf8");
    res.set("Cache-Control","no-store").type("application/json").send(j);
  }catch{
    res.status(404).json({ ok:false, error:"no latest.json yet" });
  }
});

// ---- start ----
app.listen(PORT, ()=>{
  console.log(`[VCAI] Mode: ${process.env.OPENAI_API_KEY ? "LIVE" : "OFFLINE"}`);
  console.log(`API + Docs on http://localhost:${PORT}`);
});
