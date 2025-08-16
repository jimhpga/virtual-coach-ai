// ---------- State & helpers ----------
const busy = document.getElementById('busy');
const setBusy = (on, text) => { try{ busy.hidden = !on; if(text) document.getElementById('busyText').textContent = text; }catch(_){} };
document.getElementById('date').textContent = new Date().toLocaleDateString();

let lastData = null;

function sanitizeJSONText(t){
  return (t||"")
    .replace(/[\uFEFF\u200B\u200C\u200D\u200E\u200F\u202A-\u202E]/g,'')
    .replace(/^[^\[{]+/, '').replace(/[^\]}]+$/, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g,'')
    .trim();
}

const fmt=v=>`${v}%`;
const band=v=>v>=75?'ok':v>=55?'warn':'bad';
const metricRow=m=>`<div class="metric" data-tags="${(m.tags||[]).join(' ')}"><div class="name">${m.label}</div><div class="bar"><span class="${band(m.value)}" style="width:${m.value}%"></span></div><div class="pct">${fmt(m.value)}</div></div>`;
const posRow=p=>`<div class="metric"><div class="name">${p.p}</div><div class="bar"><span class="${band(p.value)}" style="width:${p.value}%"></span></div><div class="pct">${fmt(p.value)}</div></div>`;

const defaultLong={
  P1:'Athletic setup with neutral grip, soft knees, and neutral pelvis tilt. Pressure 55/45 lead-to-trail under the arches, ball position appropriate for the club. Spine long (not slumped), shoulders relaxed, eye line level.',
  P2:'Shaft parallel to the ground with width maintained. Hands stay in front of chest, club parallel to target line, wrists setting gradually. Clubface orientation near toe-up (neutral) rather than shut or excessively open.',
  P3:'Lead arm parallel with a full turn of the torso. Trail elbow folds in front of ribcage (not flying). Club angle on plane; hands keep space from chest (no collapse).',
  P4:'Top: pressure into trail heel, trail hip deep. Lead wrist closer to flat/bowed. Club not wildly across/laid off; head stable.',
  P5:'Transition: pelvis → torso → arms. Shaft shallows, trail elbow in front of seam line. Maintain lead-wrist flexion; pressure shifts to lead mid-foot.',
  P6:'Delivery: shaft parallel, hands ahead, face square to path, trail elbow tucked. Pelvis keeps rotating; chest opening.',
  P7:'Impact: forward shaft lean, low point forward. Pelvis 30–45° open, chest 10–20° open, lead leg braced. Face near square; ball then turf.',
  P8:'Post-impact: trail arm extends, handle around body (no flip). Divot past ball; rotation balanced.',
  P9:'Finish: weight to lead side, buckle/chest to target, trail toe down. Hold the pose.'
};

function renderReport(data){
  lastData=data;
  if(data.discipline){ document.getElementById('modeLabel').textContent = /putt/i.test(data.discipline)?'Putting':/chip/i.test(data.discipline)?'Chipping':'Full Swing'; }
  if(data.swings!=null){ document.getElementById('swingCount').textContent = String(data.swings); }

  const swingHtml=(data.swing_metrics||[]).map(metricRow).join('')||'<div class="sub">No swing metrics.</div>';
  const posHtml=(data.position_metrics||[]).map(posRow).join('')||'<div class="sub">No position metrics.</div>';
  document.getElementById('swing').innerHTML=swingHtml;
  document.getElementById('position').innerHTML=posHtml;

  const p=data.power||{score:0,tempo:'—',release_timing:0};
  document.getElementById('power').innerHTML=
    `<div class="metric"><div class="name">Power Score</div><div class="bar"><span class="${band(p.score)}" style="width:${p.score}%"></span></div><div class="pct">${fmt(p.score)}</div></div>
     <div class="metric"><div class="name">Tempo</div><div class="bar"><span class="ok" style="width:76%"></span></div><div class="pct">${p.tempo}</div></div>
     <div class="metric"><div class="name">Release Timing</div><div class="bar"><span class="${band(+p.release_timing)}" style="width:${+p.release_timing||0}%"></span></div><div class="pct">${+p.release_timing||0}%</div></div>`;

  let phases=Array.isArray(data.phases)?data.phases.slice():[];
  if(!phases.length){
    const names=['Setup','Shaft Parallel (Backswing)','Lead Arm Parallel (Backswing)','Top of Swing','Lead Arm Parallel (Downswing)','Shaft Parallel (Downswing)','Impact','Trail Arm Parallel (Follow-Through)','Finish'];
    const pm=data.position_metrics||[];
    for(let i=0;i<9;i++){
      const pid='P'+(i+1), m=pm.find(x=>String(x.p).toUpperCase()===pid)||{value:0};
      const g=m.value>=75?'good':m.value>=55?'ok':'bad';
      phases.push({id:pid,name:names[i],short:'',long:'',grade:g});
    }
  }
  document.getElementById('plist').innerHTML=phases.map((ph,i)=>`
    <details ${i===0?'open':''} class="panel">
      <summary><span class="pnum">${ph.id||('P'+(i+1))}</span> <span class="pname">${ph.name||''}</span> <span class="gchip g-${(ph.grade||'ok')}" style="margin-left:8px">${String(ph.grade||'OK').toUpperCase()}</span> <span class="sub" style="margin-left:8px">${ph.short||''}</span><svg class="caret" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></summary>
      <div class="content">
        <div class="sub" style="margin-bottom:8px">${ph.short||''}</div>
        <div style="margin-bottom:10px">${(ph.long && ph.long.trim() && ph.long.trim() !== (ph.short||'').trim()) ? ph.long : (defaultLong[ph.id||('P'+(i+1))]||'')}</div>
        <button class="btn view-video" data-url="${ph.video||ph.video_url||''}">View Video</button>
      </div>
    </details>`).join('');

  renderCoaching(data); renderPractice(data);
}

function renderCoaching(data){
  const pri=(data.coaching&&Array.isArray(data.coaching.priority_fixes))?data.coaching.priority_fixes:[
    {title:'Clubface control at P7 (impact)',short:'Match face to path window.',long:'Your face angle is drifting open at P6→P7. Prioritize a neutral grip check and lead-wrist flexion (bowing) from P5→P6. Rehearse 8 reps of half-swings keeping the logo to target through P7.'},
    {title:'Lower body sequence',short:'Clear hips before hands.',long:'You’re firing the hands early. Feel the lead hip clear as pressure shifts to lead heel from P4. Use step-through drill: backswing, step toward target as you start down.'},
    {title:'Hand path width',short:'Avoid across-the-line.',long:'At P3 your hand path narrows. Rehearse pump-downs: P3 → mini P4 → P5 with a wide feel, trail elbow connected.'}
  ];
  const pow=(data.coaching&&Array.isArray(data.coaching.power_fixes))?data.coaching.power_fixes:[
    {title:'Tempo 3:1',short:'Smooth it out.',long:'Backswing too quick. Count “one-two-three” back, “one” through. Use metronome 72 bpm, strike on every 4th tick.'},
    {title:'Lead-leg brake',short:'Post into lead side.',long:'Plant lead heel from P4 and straighten lead leg through P5–P6. Towel under lead heel to feel pressure shift.'},
    {title:'Late release timing',short:'Deliver speed at P7–P8.',long:'Hold wrist angles to P6, then unhinge through impact. Two-tee gate at ball for feedback.'}
  ];
  const mk=i=>`<details class="panel"><summary><span class="pname">${i.title}</span><span class="sub" style="margin-left:8px">${i.short||''}</span><svg class="caret" width="18" height="18" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></summary><div class="content">${i.long||''}</div></details>`;
  document.getElementById('coachPriority').innerHTML=pri.map(mk).join('');
  document.getElementById('coachPower').innerHTML=pow.map(mk).join('');
}

function renderPractice(data){
  const plan=(data.practice_plan&&Array.isArray(data.practice_plan))?data.practice_plan:Array.from({length:14},(_,i)=>({
    day:i+1,title:(i%2?'Contact + Face':'Tempo + Sequence'),
    drills:['9-to-3 drill × 15 balls (clip P6→P8).','Step-through swing × 10 focusing on lead-leg brake.','Gate drill at impact × 15 balls.']
  }));
  document.getElementById('practice').innerHTML=plan.map(d=>`
    <details class="panel" ${d.day===1?'open':''}>
      <summary><span class="pname">Day ${d.day}</span> <span class="sub" style="margin-left:8px">${d.title||''}</span><svg class="caret" width="18" height="18" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></summary>
      <div class="content">${(d.drills||[]).map(x=>`<div>• ${x}</div>`).join('')||'<div class="sub">No drills provided.</div>'}</div>
    </details>`).join('');
}

// -------- Loader --------
async function loadReport(url){
  const s=document.getElementById('status'), e=document.getElementById('error');
  e.textContent=''; s.innerHTML=`Loading <a href="${url}" target="_blank" rel="noopener">${url}</a>…`;
  let raw='';
  try{
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    raw=await res.text();
    const cleaned=sanitizeJSONText(raw);
    let data;
    try{ data=JSON.parse(cleaned); }
    catch(parseErr){
      const start=cleaned.indexOf('{'), end=cleaned.lastIndexOf('}');
      if(start>-1 && end>start){ data=JSON.parse(cleaned.slice(start,end+1)); }
      else { throw parseErr; }
    }
    lastData=data; renderReport(data);
    s.innerHTML=`Loaded: <a href="${url}" target="_blank" rel="noopener">${url}</a>`;
  }catch(err){
    e.textContent='Failed to load report: '+(err?.message||String(err));
    const dbg=document.getElementById('debugOut');
    if(dbg){ dbg.textContent = `Fetch text (first 240 chars):\n${(raw||'').slice(0,240)}\n\nCleaned preview (first 240):\n${sanitizeJSONText(raw||'').slice(0,240)}`; }
    renderReport(sample);
    s.textContent='Loaded SAMPLE (parse failed): '+url;
  }
}

// -------- Sample (always valid) --------
const sample={swings:1,discipline:'full-swing',power:{score:78,tempo:'3.0:1',release_timing:62},
  swing_metrics:[
    {label:'Right Arm Angle',value:84,tags:['arm-bend']},
    {label:'Club Face Angle',value:79,tags:['face-angle']},
    {label:'Shoulder Turn',value:72,tags:['shoulder-turn']},
    {label:'Hip Turn',value:68,tags:['hip-movement']},
    {label:'X-Factor (Shoulder–Hip)',value:64,tags:['sequence']},
    {label:'Club Path',value:71,tags:['club-path']},
    {label:'Face-to-Path',value:66,tags:['face-angle']},
    {label:'Attack Angle',value:62,tags:['delivery']}
  ],
  position_metrics:[{p:'P1',value:90},{p:'P2',value:74},{p:'P3',value:61},{p:'P4',value:55},{p:'P5',value:63},{p:'P6',value:70},{p:'P7',value:81},{p:'P8',value:86},{p:'P9',value:78}],
  phases:[
    {id:'P1',name:'Setup',short:'Athletic stance, posture aligned',long:'',grade:'good'},
    {id:'P2',name:'Shaft Parallel (Backswing)',short:'Club parallel, early width',long:'',grade:'ok'},
    {id:'P3',name:'Lead Arm Parallel (Backswing)',short:'Good extension, slight flat',long:'',grade:'ok'},
    {id:'P4',name:'Top of Swing',short:'Full coil',long:'',grade:'bad'},
    {id:'P5',name:'Lead Arm Parallel (Downswing)',short:'Arm drops inside',long:'',grade:'good'},
    {id:'P6',name:'Shaft Parallel (Downswing)',short:'Shallowing, trail elbow leads',long:'',grade:'good'},
    {id:'P7',name:'Impact',short:'Hips open, shaft lean',long:'',grade:'ok'},
    {id:'P8',name:'Trail Arm Parallel (Follow-Through)',short:'Balanced extension',long:'',grade:'good'},
    {id:'P9',name:'Finish',short:'Upright, balanced',long:'',grade:'good'}
  ]
};

// -------- Events & UI wiring --------
function bindUI(){
  const getPath=()=> new URLSearchParams(location.search).get('report') || document.body.dataset.reportSrc || '/reports/demo/report.json';
  const reloadBtn=document.getElementById('reload');
  const sampleBtn=document.getElementById('sample');
  const expAllBtn=document.getElementById('expandAll');
  const colAllBtn=document.getElementById('collapseAll');
  const focusSel=document.getElementById('focus');

  if(reloadBtn) reloadBtn.addEventListener('click',()=>loadReport(getPath()));
  if(sampleBtn) sampleBtn.addEventListener('click',()=>{ renderReport(sample); document.getElementById('status').textContent='Loaded sample (no fetch).'; });
  if(expAllBtn) expAllBtn.addEventListener('click',()=>{ document.querySelectorAll('details.panel').forEach(d=>d.open=true); });
  if(colAllBtn) colAllBtn.addEventListener('click',()=>{ document.querySelectorAll('details.panel').forEach(d=>d.open=false); });
  if(focusSel)  focusSel.addEventListener('change',e=>{
    const val=e.target.value;
    document.querySelectorAll('.metric').forEach(el=>{
      el.classList.remove('focus-dim'); if(val==='all') return;
      const tags=(el.getAttribute('data-tags')||'').split(' ');
      if(!tags.includes(val)) el.classList.add('focus-dim');
    });
  });
  document.getElementById('plist').addEventListener('click',e=>{
    const btn=e.target.closest('.view-video'); if(!btn) return; const url=btn.getAttribute('data-url');
    const mount=document.getElementById('videoMount'); mount.innerHTML='';
    if(url){ const v=document.createElement('video'); v.controls=true; v.playsInline=true; v.style.width='100%'; v.src=url; mount.appendChild(v); }
    else { mount.textContent='No video for this phase.'; }
    document.getElementById('videoOverlay').hidden=false;
  });
  document.getElementById('hideOverlay').onclick=()=>{ document.getElementById('progressOverlay').hidden=true; document.getElementById('videoOverlay').hidden=true; busy.hidden=true; };
}
bindUI();
document.addEventListener('DOMContentLoaded',bindUI);

const auto=new URLSearchParams(location.search).get('report') || document.body.dataset.reportSrc || '/reports/demo/report.json';
if(auto){ loadReport(auto); }
window.addEventListener('load',()=>{ try{ busy.hidden=true; document.getElementById('progressOverlay').hidden=true; document.getElementById('videoOverlay').hidden=true; }catch(_){} });
