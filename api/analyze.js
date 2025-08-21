// /api/analyze.js
const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");

const BUCKET = process.env.VCA_BUCKET_UPLOADS;
const REGION = process.env.AWS_REGION || "us-west-2";
const s3 = new S3Client({ region: REGION });

// deterministic “random” from a string
function seedFrom(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=(h*16777619)>>>0; } return h; }
function rand01(seed){ seed = (seed*1664525+1013904223)>>>0; return [seed, (seed>>>8)/0xFFFFFF]; }

function variedGrades(seedBase){
  let seed = seedFrom(seedBase);
  const ids = ['P1','P2','P3','P4','P5','P6','P7','P8','P9'];
  return ids.map((id,i)=>{
    let r; [seed,r]=rand01(seed);
    const g = r<0.25 ? 'bad' : r<0.6 ? 'ok' : 'good';
    return { id, name:['Setup','Takeaway','Lead Arm Parallel','Top','Delivery','Shaft Parallel','Impact','Post-Impact','Finish'][i], grade:g };
  });
}

function buildReport({ key, sizeBytes }){
  const base = `${key}|${sizeBytes||0}`;
  const grades = variedGrades(base);
  const now = new Date();

  // fabricate duration-based “power” from size; swap with real metrics later
  const approxSec = Math.max(2, Math.min(12, Math.round((sizeBytes||5_000_000) / 800_000)));
  const durScore = Math.max(40, Math.min(95, approxSec*8));
  const relScore = Math.max(35, Math.min(90, 60 + (approxSec-3)*5));

  const phases = grades.map((g)=>({
    id:g.id, name:g.name, grade:g.grade,
    short: g.grade==='bad' ? 'Needs attention' : g.grade==='good' ? 'Solid' : 'Workable',
    long: 'Tap Video to review this checkpoint with your coach.',
    ref: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`
  }));

  return {
    discipline:'Full Swing',
    date: now.toISOString(),
    swings: 1,
    phases,
    coaching:{
      priority_fixes:[
        { title:'One Key Feel', short:'Pick one cue', long:'Use one external cue for 15 balls (e.g., finish tall).', ref:''},
        { title:'Tempo Baseline', short:'~3:1', long:'Count “one-two-three-hit” to smooth transition.', ref:''},
        { title:'Impact Check', short:'Ball→turf', long:'Half swings with a mid-iron; video two reps to confirm.', ref:''},
      ],
      power_fixes:[{ title:'Finish Tall', short:'No stall', long:'Let chest face target; stand tall.', ref:''}]
    },
    position_metrics:[{label:'Setup Match',value:72},{label:'Top Position',value:66},{label:'Impact Alignments',value:70}],
    swing_metrics:[{label:'Tempo Repeatability',value:76},{label:'Face-to-Path Stability',value:64}],
    power:{ score:durScore, tempo:'~3:1', release_timing:relScore }
  };
}

module.exports = async (req, res) => {
  try{
    const { key } = req.query || {};
    if (!key) { res.status(400).json({ error:'key required' }); return; }

    let sizeBytes = 0;
    try{
      const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
      sizeBytes = Number(head.ContentLength || 0);
    }catch(e){
      // if HeadObject not allowed, we still produce a report
      console.warn('HeadObject failed (continuing):', e?.name || e);
    }

    const report = buildReport({ key, sizeBytes });
    res.status(200).json({ report });
  }catch(e){
    console.error(e);
    res.status(500).json({ error:'analyze failed' });
  }
};
