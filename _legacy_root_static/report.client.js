(async function(){
  const $ = (sel) => document.querySelector(sel);

  // Read query params
  const url = new URL(window.location.href);
  const key   = url.searchParams.get("key") || "demo.mov";
  const demo  = url.searchParams.get("demo") === "1";

  const ui = {
    report:  $("#report"),
    pending: $("#pending"),
    meta:    $("#meta"),
    pwrBar:  $("#pwrBar"),
    pwrLbl:  $("#pwrLbl"),
    consBar: $("#consBar"),
    consLbl: $("#consLbl"),
    funds:   $("#funds"),
    errs:    $("#errs"),
    fixes:   $("#fixes"),
    exp:     $("#exp"),
    drillList: $("#drillList"),
    badgeRow:  $("#badgeRow"),
    deltas:  $("#deltas"),
    coachCopy: $("#coachCopy")
  };

  function txt(el, s){ if(el) el.textContent = s; }
  function li(parent, s){
    const li = document.createElement("li");
    li.textContent = s;
    parent.appendChild(li);
  }
  function showPending(msg){
    if(!ui.pending) return;
    ui.pending.style.display = "block";
    ui.pending.textContent = msg;
  }
  function hidePending(){ if(ui.pending) ui.pending.style.display = "none"; }
  function showReport(){ if(ui.report) ui.report.style.display = "block"; }

  async function fetchReport(){
    const q = new URLSearchParams({ key });
    if(demo) q.set("demo","1");
    const res = await fetch(`/api/report?${q.toString()}`);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  function renderDemoShape(d){
    // Normalized fields from the demo API you tested
    // d = { ok:true, status:"ready", ... }  OR the earlier full object
    const isNewShape = !!d.status; // newer compact demo
    const metaTitle = `Swing Report — ${key}`;
    txt(ui.meta, metaTitle);

    // Progress numbers
    let power = 0, consistency = 0;
    if (isNewShape){
      power = d.swingScore ?? 0;
      consistency = 72; // not present in compact demo; show placeholder
    } else {
      power = d.summary?.powerScore ?? 0;
      consistency = d.summary?.consistency ?? 0;
    }
    if(ui.pwrBar) ui.pwrBar.style.width = `${Math.max(0, Math.min(100, power))}%`;
    txt(ui.pwrLbl, `${power}`);

    if(ui.consBar) ui.consBar.style.width = `${Math.max(0, Math.min(100, consistency))}%`;
    txt(ui.consLbl, `${consistency}`);

    // Lists
    function fillList(listEl, items){
      if(!listEl) return;
      listEl.innerHTML = "";
      (items || []).forEach(s => li(listEl, s));
    }

    if (isNewShape){
      // Map compact demo to UI lists
      fillList(ui.funds, ["Neutral grip & posture","Centered pivot","Sequenced downswing"]);
      fillList(ui.errs, (d.faults||[]).map(f => f.code.replace(/-/g," ")));
      fillList(ui.fixes, ["Half-swing with pause at P3","Trail wrist preset","Lead-hand only chips"]);
      fillList(ui.exp, [
        "If you rotate forearms more: starts left are normal for a bit.",
        "If you rotate body faster: AoA shallows → expect some grounders.",
        "Small misses while it ‘beds in’ are expected.",
      ]);
      fillList(ui.drillList, [
        "Gate drill 6–12 inches ahead of the ball",
        "Step-through drill for rotation/shallowing",
        "Alignment stick down trail side (no early extend)",
      ]);
      if(ui.coachCopy) ui.coachCopy.textContent = "Good move. Small mess-ups mean it’s changing — keep the drills tight.";
    } else {
      fillList(ui.funds, d.fundamentals);
      fillList(ui.errs, d.errors);
      fillList(ui.fixes, d.quickFixes);
      fillList(ui.exp, d.expectations);
      fillList(ui.drillList, d.drills);
      if(ui.coachCopy) ui.coachCopy.textContent = d.coachCopy || "";
    }

    // Deltas / badges (optional placeholders)
    if(ui.deltas){
      ui.deltas.innerHTML = "";
      const p = document.createElement("div");
      p.className = "mono";
      p.textContent = "Δ Power/Consistency showing relative change.";
      ui.deltas.appendChild(p);
    }
  }

  // ---- boot ----
  try{
    showPending("Loading report…");
    const data = await fetchReport();

    // Handle “NOT_READY” etc.
    if(!data.ok && data.error === "NOT_READY"){
      showPending("Analysis is still processing. Check back shortly.");
      return;
    }
    hidePending();
    showReport();

    // Render based on shape
    renderDemoShape(data.report || data);

  } catch(err){
    console.error(err);
    showPending(`Error loading report: ${err.message}`);
  }
})();