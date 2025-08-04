/* script.js — drop-in replacement
   - Click #analyzeBtn to run analysis
   - Reads #videoUrl (optional; uses placeholder if empty)
   - Calls /api/analyze with a mock so P1–P9 show now
   - Renders metrics into #metrics (table or list)
   - Shows messages in #notice
*/

(function () {
  // ---- Element getters (safe) ----
  const $ = (sel) => document.querySelector(sel);
  const analyzeBtn = $('#analyzeBtn');
  const videoInput = $('#videoUrl');
  const noticeBox  = $('#notice');
  const metricsBox = $('#metrics');       // <div id="metrics"> or <table id="metrics">

  // ---- Small helpers ----
  function setNotice(msg, type = 'info') {
    if (!noticeBox) {
      console[type === 'error' ? 'error' : 'log']('[notice]', msg);
      return;
    }
    noticeBox.textContent = msg;
    noticeBox.style.display = msg ? 'block' : 'none';
    noticeBox.setAttribute('data-type', type);
  }

  function setBusy(isBusy) {
    if (analyzeBtn) {
      analyzeBtn.disabled = !!isBusy;
      analyzeBtn.textContent = isBusy ? 'Analyzing…' : (analyzeBtn.getAttribute('data-label') || 'Analyze');
    }
  }

  function clearMetrics() {
    if (!metricsBox) return;
    if (metricsBox.tagName === 'TABLE') {
      const tbody = metricsBox.tBodies[0] || metricsBox.createTBody();
      tbody.innerHTML = '';
    } else {
      metricsBox.innerHTML = '';
    }
  }

  function renderMetrics(metrics) {
    // Expecting an object like { P1: number, ..., P9: number }
    const keys = ['P1','P2','P3','P4','P5','P6','P7','P8','P9'];
    const rows = keys.map(k => ({ k, v: metrics?.[k] ?? null }));

    if (!metricsBox) {
      console.table(rows);
      return;
    }

    if (metricsBox.tagName === 'TABLE') {
      const tbody = metricsBox.tBodies[0] || metricsBox.createTBody();
      tbody.innerHTML = '';
      rows.forEach(({ k, v }) => {
        const tr = document.createElement('tr');
        const tdK = document.createElement('td');
        const tdV = document.createElement('td');
        tdK.textContent = k;
        tdV.textContent = (v ?? '—');
        tr.appendChild(tdK);
        tr.appendChild(tdV);
        tbody.appendChild(tr);
      });
    } else {
      // Generic div: render simple list
      metricsBox.innerHTML = '';
      const ul = document.createElement('ul');
      rows.forEach(({ k, v }) => {
        const li = document.createElement('li');
        li.textContent = `${k}: ${v ?? '—'}`;
        ul.appendChild(li);
      });
      metricsBox.appendChild(ul);
    }
  }

  async function runAnalyze(videoUrl) {
    setNotice('', 'info');
    clearMetrics();
    setBusy(true);

    try {
      const body = {
        videoUrl: videoUrl || 'https://example.com/swing.mp4',
        // MOCK so we see numbers now; remove this once real data flows
        mock: { metrics: { P1:1, P2:2, P3:3, P4:4, P5:5, P6:6, P7:7, P8:8, P9:9 } }
      };

      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      let resp;
      try {
        resp = await r.json();
      } catch {
        setNotice('Server returned non-JSON. Check Functions Logs.', 'error');
        return;
      }

      if (!r.ok) {
        setNotice(resp?.error || `Analyze failed (${r.status})`, 'error');
        return;
      }

      if (!resp || !resp.metrics) {
        setNotice('No metrics returned — check Functions Logs.', 'error');
        return;
      }

      renderMetrics(resp.metrics);
      setNotice('Report ready.', 'info');
    } catch (e) {
      setNotice(`Network error: ${e?.message || e}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  // ---- Wire up button ----
  if (analyzeBtn) {
    if (!analyzeBtn.getAttribute('data-label')) {
      analyzeBtn.setAttribute('data-label', analyzeBtn.textContent || 'Analyze');
    }
    analyzeBtn.addEventListener('click', () => {
      const url = videoInput ? (videoInput.value || '').trim() : '';
      runAnalyze(url);
    });
  } else {
    // Auto-run once if there is no button (for quick testing)
    runAnalyze('');
  }

  // Minimal styles for notice (optional)
  if (noticeBox && !noticeBox.hasChildNodes()) {
    noticeBox.style.display = 'none';
  }
})();
