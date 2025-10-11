/* Report client v3 — baseline compare, teacher voice, expectations, badges */
(() => {
  const $ = s => document.querySelector(s);
  const ui = {
    meta: $('#meta'),
    share: $('#share'),
    pending: $('#pending'),
    report: $('#report'),
    teacher: $('#teacher'),
    baselineSel: $('#baseline'),
    setBaseline: $('#setBaseline'),
    clearBaseline: $('#clearBaseline'),

    pwrBar: $('#pwrBar'), pwrLbl: $('#pwrLbl'),
    consBar: $('#consBar'), consLbl: $('#consLbl'),
    deltas: $('#deltas'),

    funds: $('#funds'), errs: $('#errs'), fixes: $('#fixes'),
    expect: $('#exp'), drills: $('#drillList'),
    badges: $('#badgeRow'),
    coachCopy: $('#coachCopy'),
  };

  const qs = new URLSearchParams(location.search);
  const key = qs.get('key') || 'DEMO';

  // ---- local data (simple persistence) ----
  const LS_BASELINE_KEY = 'vca.baseline.key';
  const LS_HISTORY = 'vca.report.history'; // array of brief summaries

  const history = loadHistory();

  // Fill baseline selector from history
  fillBaselineOptions();

  // Default teacher voice
  ui.teacher.value = localStorage.getItem('vca.teacher') || 'nice';
  ui.teacher.addEventListener('change', () => localStorage.setItem('vca.teacher', ui.teacher.value));

  // Share link
  ui.share.addEventListener('click', async e => {
    e.preventDefault();
    const url = `${location.origin}/report.html?key=${encodeURIComponent(key)}`;
    await navigator.clipboard.writeText(url).catch(()=>{});
    ui.share.textContent = 'Link copied!';
    setTimeout(()=> ui.share.textContent = 'Copy share link', 1800);
  });

  ui.setBaseline.addEventListener('click', () => {
    localStorage.setItem(LS_BASELINE_KEY, key);
    addToHistory({ key, when: Date.now(), note: 'Set as baseline' });
    fillBaselineOptions();
    render(computed);
  });
  ui.clearBaseline.addEventListener('click', () => {
    localStorage.removeItem(LS_BASELINE_KEY);
    fillBaselineOptions();
    render(computed);
  });
  ui.baselineSel.addEventListener('change', () => {
    const chosen = ui.baselineSel.value || '';
    if (chosen === '') localStorage.removeItem(LS_BASELINE_KEY);
    else localStorage.setItem(LS_BASELINE_KEY, chosen);
    render(computed);
  });

  // ---- Fetch with pending/polling ----
  ui.pending.style.display = 'block';
  ui.pending.textContent = 'Loading analysis…';

  // 60s polling window
  const start = Date.now();
  let computed = null;

  (async function init(){
    while (true) {
      try {
        const data = await fetchReport(key);
        if (data) {
          computed = compute(data);
          addToHistory({ key, when: Date.now(), pwr: computed.pwr, cons: computed.cons });
          ui.pending.style.display = 'none';
          ui.report.style.display = 'block';
          render(computed);
          return;
        }
      } catch (e) {
        console.warn(e);
        ui.pending.textContent = 'Problem loading the report.';
        return;
      }
      if (Date.now() - start > 60000) {
        ui.pending.textContent = 'Analysis still processing. Check back soon.';
        return;
      }
      await wait(5000);
      ui.pending.textContent = 'Still analyzing…';
    }
  })();

  // -------- helpers --------
  function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

  async function fetchReport(k){
    const res = await fetch(`/api/report?key=${encodeURIComponent(k)}`);
    if (!res.ok) throw new Error('report http ' + res.status);
    const j = await res.json();
    if (!j || !j.ok) return null; // still processing
    return j;
  }

  function inchesToFeetIn(inches){
    if (!inches) return '—';
    const ft = Math.floor(inches/12);
    const ins = inches % 12;
    return `${ft}'${ins}"`;
  }

  function baselineKey(){
    return localStorage.getItem(LS_BASELINE_KEY) || '';
  }

  function loadHistory(){
    try { return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'); }
    catch { return []; }
  }
  function saveHistory(h){ localStorage.setItem(LS_HISTORY, JSON.stringify(h.slice(-30))); }
  function addToHistory(entry){
    const existing = history.find(h => h.key === entry.key);
    if (!existing) history.push(entry);
    saveHistory(history);
    fillBaselineOptions();
  }

  function fillBaselineOptions(){
    const current = baselineKey();
    ui.baselineSel.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = ''; opt0.textContent = '— none —';
    ui.baselineSel.appendChild(opt0);
    history.forEach(h=>{
      const o = document.createElement('option');
      o.value = h.key;
      const date = new Date(h.when || Date.now()).toLocaleString();
      o.textContent = `${h.key === 'DEMO' ? 'DEMO' : h.key.slice(-12)} · ${date}`;
      if (h.key === current) o.selected = true;
      ui.baselineSel.appendChild(o);
    });
  }

  // ------------- compute phase (shape tolerant) -------------
  function compute(j){
    const m = j.meta || {};
    const a = j.analysis || {};
    const scores = a.scores || {};
    const pwr = clamp(+scores.power ?? 0, 0, 100);
    const cons = clamp(+scores.consistency ?? 0, 0, 100);

    // baseline snapshot
    let base = null;
    const baseKey = baselineKey();
    if (baseKey && baseKey !== key) {
      const h = history.find(x => x.key === baseKey);
      if (h && (h.pwr != null || h.cons != null)) {
        base = { pwr: h.pwr ?? null, cons: h.cons ?? null };
      }
    }

    // generic lists (tolerant to absent fields)
    const funds = (a.fundamentals || a.topFundamentals || []).slice(0,3);
    const errs  = (a.errors || a.topErrors || []).slice(0,3);
    const fixes = (a.fixes || a.quickFixes || []).slice(0,3);
    const drills= (a.drills || []).slice(0,6);

    // expectations — if API doesn’t provide, synthesize
    let expect = a.expectations || [];
    if (!expect.length) {
      expect = synthesizeExpectations({ a, base, pwrDelta: base ? pwr-(base.pwr??pwr) : 0 });
    }

    // badges
    const badges = makeBadges({ pwr, cons, base });

    return {
      key: j.key,
      name: m.name || 'Golfer',
      email: m.email || '',
      heightInches: m.heightInches || null,
      heightLabel: inchesToFeetIn(m.heightInches),
      date: new Date(j.createdAt || Date.now()).toLocaleString(),
      pwr, cons, base,
      funds, errs, fixes, drills, expect, badges,
      teacher: (localStorage.getItem('vca.teacher') || 'nice')
    };
  }

  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

  function synthesizeExpectations({ a, base, pwrDelta }){
    // Lightweight heuristics + expert notes
    const out = [];
    out.push('Right after a change, contact may move low — a few ground balls are common as the body learns the new bottom of arc.');
    out.push('More forearm rotation can start the ball left; pair it with body rotation to keep the face matching the path.');
    out.push('If you rotate the body faster, the angle of attack shallows — expect some thin/low starts until the timing matches.');
    if (pwrDelta > 3) out.push('Power jumped — distances may spike; spend a bucket calibrating new carry numbers.');
    if (pwrDelta < -3) out.push('Power dipped — that’s temporary while you sequence the new pattern.');
    return out;
  }

  function makeBadges({ pwr, cons, base }){
    const b = [];
    const prev = base?.pwr ?? null;
    if (prev == null) b.push({ name:'First Upload', note:'Welcome! Baseline set recommended.'});
    if (prev != null && pwr > prev) b.push({ name:'New PR: Power', note:`+${(pwr - prev).toFixed(0)} vs baseline`});
    if (cons >= 70) b.push({ name:'Consistency 70+', note:'Nice repeatability' });
    if (pwr >= 80) b.push({ name:'Speedy 80+', note:'Strong power production' });
    return b;
  }

  function render(c){
    if (!c) return;

    // meta header
    ui.meta.innerHTML = `
      <span class="muted">Key:</span> <span class="mono">${c.key}</span>
      &nbsp;•&nbsp; <span class="muted">When:</span> ${c.date}
      ${c.heightInches ? `&nbsp;•&nbsp; <span class="muted">Height:</span> ${c.heightLabel}` : ''}
      ${c.email ? `&nbsp;•&nbsp; <span class="muted">Email:</span> ${escapeHtml(c.email)}` : ''}
    `;

    // scores
    ui.pwrBar.style.width = `${c.pwr}%`;
    ui.pwrLbl.textContent = `${c.pwr}/100`;
    ui.consBar.style.width = `${c.cons}%`;
    ui.consLbl.textContent = `${c.cons}/100`;

    // deltas vs baseline
    ui.deltas.innerHTML = '';
    if (c.base && (c.base.pwr!=null || c.base.cons!=null)) {
      const p = (c.base.pwr==null) ? '—' : deltaFmt(c.pwr - c.base.pwr);
      const q = (c.base.cons==null) ? '—' : deltaFmt(c.cons - c.base.cons);
      ui.deltas.innerHTML = `
        <div class="row">
          <span class="badge">Δ Power: ${p}</span>
          <span class="badge">Δ Consistency: ${q}</span>
        </div>`;
    }

    // lists
    fillList(ui.funds, c.funds, 'Keep building these fundamentals.');
    fillList(ui.errs,  c.errs,  'Biggest power leaks.');
    fillList(ui.fixes, c.fixes, 'Quickest improvements.');
    fillList(ui.drills,c.drills,'Try these to groove the pattern.');

    // expectations
    ui.expect.innerHTML = '';
    c.expect.forEach(x=>{
      const li = document.createElement('li'); li.textContent = x; ui.expect.appendChild(li);
    });

    // badges
    ui.badges.innerHTML = '';
    c.badges.forEach(b=>{
      const el = document.createElement('span');
      el.className='badge';
      el.textContent = `${b.name}${b.note?` — ${b.note}`:''}`;
      ui.badges.appendChild(el);
    });

    // teacher voice copy
    ui.coachCopy.innerHTML = coachCopy(c.teacher, c);
  }

  function fillList(ol, items, emptyNote){
    ol.innerHTML = '';
    if (!items || !items.length) {
      const li = document.createElement('li'); li.className='muted'; li.textContent = emptyNote;
      ol.appendChild(li); return;
    }
    items.forEach(t=>{
      const li = document.createElement('li'); li.textContent = typeof t === 'string' ? t : (t.text || JSON.stringify(t));
      ol.appendChild(li);
    });
  }

  function deltaFmt(n){
    const s = (n>0?'+':'') + (Math.round(n*10)/10);
    return s;
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  function coachCopy(mode, c){
    const open = {
      nice:       `Great work, ${escapeHtml(c.name)}! Progress happens one rep at a time.`,
      oldschool:  `Listen up. You made changes; now you own the work.`,
      supportive: `You’re doing the right things, ${escapeHtml(c.name)}. Let’s keep it steady.`
    }[mode] || '';

    const power = c.pwr >= 80 ? 'Power is in a strong zone.' :
                  c.pwr >= 60 ? 'Power is trending solid.' :
                                'Let’s unlock more speed with sequencing.';

    const cons  = c.cons >= 75 ? 'Consistency is reliable — your miss should tighten.' :
                  c.cons >= 55 ? 'Consistency is improving — keep grooving tempo.' :
                                 'Focus on strike location and rhythm for quick wins.';

    const compare = (c.base && c.base.pwr!=null)
      ? `You’re ${deltaWord(c.pwr - c.base.pwr)} in power and ${deltaWord(c.cons - c.base.cons)} in consistency vs baseline.`
      : `Set a baseline to make gains obvious next time.`;

    const action = `Pick one drill from the list and do 20 mindful reps. Finish with 10 balls to lock the feel.`;

    return [
      `<p>${open}</p>`,
      `<p>${power} ${cons}</p>`,
      `<p>${compare}</p>`,
      `<p><b>Action:</b> ${action}</p>`
    ].join('');
  }

  function deltaWord(d){
    if (d > 3) return `up nicely (+${d.toFixed(0)})`;
    if (d > 0.5) return `up a bit (+${d.toFixed(1)})`;
    if (d < -3) return `down a bit (${d.toFixed(0)}) — normal during changes`;
    if (d < -0.5) return `slightly down (${d.toFixed(1)})`;
    return `about even`;
  }
})();
