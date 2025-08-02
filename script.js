<script>
  // Helpers
  const overlay = document.getElementById('vc-status');
  const ovText  = document.getElementById('vc-status-text');
  function show(msg){ if (overlay){ ovText.textContent = msg; overlay.style.display='flex'; } }
  function hide(){ if (overlay) overlay.style.display='none'; }
  function toast(m){ try{alert(m);}catch(_){} }

  // Safer frame extraction on iOS
  async function extractFrames(file) {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url; video.muted = true; video.playsInline = true; video.preload = 'metadata';

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error('Could not load video metadata'));
    });

    // iOS poke
    try { await video.play(); } catch(_) {}
    video.pause();

    const dur = Math.max(0.6, Math.min(2.0, video.duration || 1.5));
    const steps = 6; // keep payload small
    const ts = Array.from({length: steps}, (_,i) => +(i * (dur / (steps - 1))).toFixed(2));

    const canvas = document.createElement('canvas');
    canvas.width = 480; canvas.height = 270;
    const ctx = canvas.getContext('2d');

    const images = [];
    for (const t of ts) {
      // seek with safety timeout
      const target = Math.min(t, (video.duration || dur) - 0.05);
      const sought = new Promise(res => {
        let done=false;
        video.onseeked = () => { if(!done){ done=true; res(); } };
        setTimeout(()=>{ if(!done){ done=true; res(); } }, 600);
      });
      video.currentTime = target;
      await sought;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      images.push(canvas.toDataURL('image/jpeg', 0.6));
    }
    URL.revokeObjectURL(url);
    return images;
  }

  // 45s watchdog for API call
  function withTimeout(promise, ms, label='operation'){
    let t; const timeout = new Promise((_,rej)=> t=setTimeout(()=>rej(new Error(label+' timeout')), ms));
    return Promise.race([promise.finally(()=>clearTimeout(t)), timeout]);
  }

  async function uploadSwing() {
    try {
      // 0) Gate: are we logged in on THIS phone?
      if (localStorage.getItem('vc_auth') !== 'ok') { window.location.href = '/login.html'; return; }

      const input = document.getElementById('swingUpload');
      const file = input?.files?.[0];
      if (!file) { toast('Please select a swing file.'); return; }

      show('Reading video…');

      // Quick duration check
      const tmpUrl = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata'; v.src = tmpUrl;
      const duration = await new Promise((resolve) => {
        v.onloadedmetadata = () => resolve(v.duration);
        v.onerror = () => resolve(NaN);
        setTimeout(()=>{ if (!isFinite(v.duration)) { v.currentTime = Number.MAX_SAFE_INTEGER; v.ontimeupdate=()=>resolve(v.duration);} }, 250);
      });
      URL.revokeObjectURL(tmpUrl);

      if (!duration || !isFinite(duration)) { hide(); toast('Could not read video length. Try another clip.'); input.value=''; return; }
      if (duration > 10) { hide(); toast('Clip too long. Please upload ≤ 10 seconds.'); input.value=''; return; }

      show('Extracting frames…');
      const frames = await extractFrames(file);

      show('Analyzing (10–30s)…');
      const id = Date.now().toString();
      const resp = await withTimeout(fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ id, frames })
      }), 45000, 'analysis');

      if (!resp.ok) {
        const txt = await resp.text();
        hide();
        toast('Analysis failed.\n' + txt.slice(0, 160));
        return;
      }

      const report = await resp.json();
      sessionStorage.setItem('vc_report_' + id, JSON.stringify(report));

      show('Building report…');
      window.location.href = `/summary.html?id=${encodeURIComponent(id)}`;
    } catch (e) {
      hide();
      toast('Upload/analysis error: ' + (e?.message || e));
    }
  }
</script>
