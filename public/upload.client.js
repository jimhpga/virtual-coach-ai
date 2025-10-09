// public/upload.client.js
(function () {
  const $ = (s) => document.querySelector(s);
  const fileInput = $("#fileInput");
  const fileLabel = $("#fileLabel");
  const btn = $("#uploadBtn");
  const logEl = $("#log");

  // new inputs
  const nameEl = $("#name");
  const emailEl = $("#email");
  const hcpEl = $("#handicap");
  const eyeEl = $("#eye");
  const hftEl = $("#hft");
  const hinEl = $("#hin");
  const hcmEl = $("#hcm");

  function log(m){ logEl.textContent += (logEl.textContent ? "\n" : "") + m; logEl.scrollTop = logEl.scrollHeight; }
  function busy(on){ btn.disabled = on; fileInput.disabled = on; }

  log("[upload v10] client JS loaded");

  fileInput?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    fileLabel.textContent = f ? `${f.name}` : "(no file)";
    if (f) log("Selected: " + f.name);
  });

  // helpers
  function parseHeightCm() {
    // if cm provided, trust it
    const cm = Number(hcmEl?.value || "");
    if (!Number.isNaN(cm) && cm >= 120 && cm <= 230) return Math.round(cm);

    // else compute from ft/in
    const ft = Number(hftEl?.value || "");
    const inch = Number(hinEl?.value || "");
    if (!Number.isNaN(ft) && !Number.isNaN(inch) && ft >= 3 && ft <= 8 && inch >= 0 && inch <= 11) {
      const totalIn = (ft * 12) + inch;
      return Math.round(totalIn * 2.54);
    }
    return null;
  }

  function getHand() {
    const checked = document.querySelector('input[name="hand"]:checked');
    return checked?.value || ""; // "R" | "L" | ""
  }

  btn?.addEventListener("click", async () => {
    const file = fileInput?.files?.[0];
    if (!file) { log("Pick a video first."); return; }

    const height_cm = parseHeightCm();
    if (!height_cm) { log("Please enter your height (ft/in OR cm)."); return; }

    const meta = {
      name: nameEl?.value?.trim() || "",
      email: emailEl?.value?.trim() || "",
      handicap: hcpEl?.value?.trim() || "",
      hand: getHand(),           // "R" | "L" | ""
      eye: eyeEl?.value || "",   // "R" | "L" | ""
      height_cm                  // number (required)
    };

    busy(true);
    try {
      log("Requesting presign…");
      const pre = await fetch("/api/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // backend ignores unknown fields; we keep filename/type/size, and include meta in case you want to log it server-side
        body: JSON.stringify({
          filename: file.name,
          type: file.type || "video/mp4",
          size: file.size,
          meta
        }),
      });
      if (!pre.ok) throw new Error("presign failed " + pre.status);
      const { url, fields, key } = await pre.json();
      if (!url || !fields || !key) throw new Error("presign response malformed");

      log("Uploading to S3…");
      const fd = new FormData();
      Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
      fd.append("file", file, file.name);
      const up = await fetch(url, { method: "POST", body: fd });
      if (!up.ok) throw new Error("S3 upload failed " + up.status);

      log("Upload complete.");
      const qp = new URLSearchParams({
        key,
        h: String(height_cm),
        hand: meta.hand,
        eye: meta.eye,
        name: meta.name,
        email: meta.email,
        hcp: meta.handicap
      });
      const viewer = `/report.html?${qp.toString()}`;
      log("Opening report view…");
      location.assign(viewer);
    } catch (e) {
      log("Error: " + (e?.message || e));
      busy(false);
    }
  });
})();
