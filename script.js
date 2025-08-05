/* script.js — adds URL presets + optional auto-run */
(function () {
  const $ = (s) => document.querySelector(s);

  const notice = $('#notice');
  const analyzeBtn = $('#analyzeBtn');
  const videoInput = $('#videoUrl');
  const selClub = $('#selectClub');
  const selModel = $('#selectModel');
  const selDataset = $('#selectDataset');

  const metricsTable = $('#metrics');

  // Summary slots (only used if you show results pre-redirect)
  const sumTempo = $('#sumTempo');
  const sumConsistency = $('#sumConsistency');
  const sumClub = $('#sumClub');
  const sumModel = $('#sumModel');
  const sumDataset = $('#sumDataset');
  const sumFixes = $('#sumFixes');
  const sumPower = $('#sumPower');
  const sumSpeed = $('#sumSpeed');

  // ---- URL presets ----
  const params = new URLSearchParams(location.search);
  const qp = {
    club: params.get('club') || '',
    model: params.get('model') || '',
    dataset: params.get('dataset') || '',
    video: params.get('video') || '',
    auto: params.get('auto') === '1' || params.get('auto') === 'true'
  };

  if (qp.club && selClub) selClub.value = qp.club;
  if (qp.model && selModel) selModel.value = qp.model;
  if (qp.dataset && selDataset) selDataset.value = qp.dataset;
  if (qp.video && videoInput) videoInput.value = qp.video;

  function setNotice(msg, type='info'){
    if (!notice) return;
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
    if (!tbody) return;
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
    sumClub && (sumClub.textContent = payload?.selections?.club || '—');
    sumModel && (sumModel.textContent = payload?.selections?.model || '—');
    sumDataset && (sumDataset.textContent = payload?.selections?.dataset || '—');
    sumTempo && (sumTempo.textContent = data?.tempo || '—');
    const vals = Object.values(data?.metrics || {});
    const consistency = vals.length ? `${Math.round(80 + (vals.reduce((a,b)=>a+(+b||0),0)/vals.length % 20))}/100` : '—';
    sumConsistency && (sumConsistency.textContent = consistency);
    sumPower && (sumPower.textContent = data?.totals?.power ?? '—');
    sumSpeed && (sumSpeed.textContent = (data?.totals?.swingSpeedAvg != null ? data.totals.swingSpeedAvg : '—'));
    sumFixes && (sumFixes.textContent = data?.fixes || 'Maintain posture, smooth transition (placeholder)');
  }

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
      if (!data?.id) { setNotice('Analysis returned without an id.', 'error'); return; }

      // Optional: render while we redirect
      renderSummary(payload, data);
      if (data.metrics) renderMetrics(data.metrics);

      // Redirect straight to summary with the new id
      const link = `/summary.html?id=${encodeURIComponent(data.id)}`;
      window.location.href = link;

    } catch (e) {
      setNotice(`Network error: ${e?.message || e}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (analyzeBtn) analyzeBtn.onclick = runAnalyze;

  // If ?auto=1, kick it off right away (good for QR flows)
  if (qp.auto) {
    // small delay so DOM is ready
    setTimeout(() => analyzeBtn?.click(), 250);
  }
})();
