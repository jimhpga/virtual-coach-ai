/* script.js v5 — three dropdowns + three-column summary + metrics */
(function () {
  const $ = (s) => document.querySelector(s);

  const notice = $('#notice');
  const analyzeBtn = $('#analyzeBtn');
  const videoInput = $('#videoUrl');
  const selClub = $('#selectClub');
  const selModel = $('#selectModel');
  const selDataset = $('#selectDataset');

  const metricsTable = $('#metrics');

  // Summary slots
  const sumTempo = $('#sumTempo');
  const sumConsistency = $('#sumConsistency');
  const sumClub = $('#sumClub');
  const sumModel = $('#sumModel');
  const sumDataset = $('#sumDataset');
  const sumFixes = $('#sumFixes');
  const sumPower = $('#sumPower');
  const sumSpeed = $('#sumSpeed');

  // ---- helpers ----
  function setNotice(msg, type='info'){
    if (!notice) return console[type==='error'?'error':'log']('[notice]', msg);
    notice.textContent = msg || '';
    notice.style.display = msg ? 'block' : 'none';
    notice.setAttribute('data-type', type);
  }

  function setBusy(isBusy){
    if (!analyzeBtn) return;
    if (!analyzeBtn.getAttribute('data-label')) {
      analyzeBtn.setAttribute('data-label', analyzeBtn.textContent || 'Analyze');
    }
    analyzeBtn.disabled = !!isBusy;
    analyzeBtn.textContent = isBusy ? 'Analyzing…' : analyzeBtn.getAttribute('data-label');
  }

  function clearMetrics(){
    if (!metricsTable) return;
    const tbody = metricsTable.tBodies[0] || metricsTable.createTBody();
    tbody.innerHTML = '';
  }

  function renderMetrics(metrics){
    const keys = ['P1','P2','P3','P4','P5','P6','P7','P8','P9'];
    const tbody = metricsTable?.tBodies?.[0] || metricsTable?.createTBody?.();
    if (!tbody) return console.table(keys.map(k=>({k, v:metrics?.[k]??'—'})));
    tbody.innerHTML = '';
    keys.forEach(k=>{
      const tr=document.createElement('tr');
      const tdK=document.createElement('td'); tdK.textContent=k;
      const tdV=document.createElement('td'); tdV.textContent=(metrics?.[k] ?? '—');
      tr.appendChild(tdK); tr.appendChild(tdV);
      tbody.appendChild(tr);
    });
  }

  function renderSummary(payload, data){
    // Dropdown echoes
    sumClub && (sumClub.textContent = payload?.selections?.club || '—');
    sumModel && (sumModel.textContent = payload?.selections?.model || '—');
    sumDataset && (sumDataset.textContent = payload?.selections?.dataset || '—');

    // From server (mock for now)
    sumTempo && (sumTempo.textContent = data?.tempo || '—');

    // Derive simple placeholders until real scoring is wired
    const consistency = (() => {
      const vals = Object.values(data?.metrics || {});
      if (!vals.length) return '—';
      const avg = vals.reduce((a,b)=>a+(+b||0),0)/vals.length;
      return `${Math.round(80 + (avg % 20))}/100`;
    })();
    sumConsistency && (sumConsistency.textContent = consistency);

    sumPower && (sumPower.textContent = data?.totals?.power ?? '—');
    sumSpeed && (sumSpeed.textContent = (data?.totals?.swingSpeedAvg != null ? data.totals.swingSpeedAvg : '—'));

    sumFixes && (sumFixes.textContent = data?.fixes || 'Maintain posture, smooth transition (placeholder)');
  }

  // ---- analyze flow ----
  async function runAnalyze() {
    setNotice('');
    clearMetrics();
    setBusy(true);

    const payload = {
      videoUrl: (videoInput?.value || '').trim() || 'https://example.com/swing.mp4',
      selections: {
        club: selClub?.value || '7I',
        model: selModel?.value || 'analysis-v1',
        dataset: selDataset?.value || 'baseline'
      }
    };

    try {
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data;
      try { data = await r.json(); }
      catch { setNotice('Server returned non-JSON. Check Functions Logs.', 'error'); return; }

      if (!r.ok) { setNotice(data?.error || `Analyze failed (${r.status})`, 'error'); return; }
      if (!data?.metrics) { setNotice('No metrics returned — check Functions Logs.', 'error'); return; }

      renderSummary(payload, data);
      renderMetrics(data.metrics);
      setNotice('Report ready.');
    } catch (e) {
      setNotice(`Network error: ${e?.message || e}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (analyzeBtn) analyzeBtn.onclick = runAnalyze;
})();
