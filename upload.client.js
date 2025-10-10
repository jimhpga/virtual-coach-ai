// upload.client.js  (v12)
(function () {
  const $ = (s) => document.querySelector(s);
  const fileInput = $("#fileInput");
  const fileLabel = $("#fileLabel");
  const btn = $("#uploadBtn");
  const logEl = $("#log");

  const coachEl = $("#coachStyle");
  const hEl     = $("#heightInches");
  const nameEl  = $("#name");
  const emailEl = $("#email");
  const hcapEl  = $("#handicap");
  const handEl  = $("#handed");
  const eyeEl   = $("#eye");
  const baseEl  = $("#baseline");

  const log  = (m) => { logEl.textContent += (logEl.textContent ? "\n" : "") + m; logEl.scrollTop = logEl.scrollHeight; };
  const busy = (on) => { btn.disabled = on; fileInput.disabled = on; };

  log("[upload v12] client JS loaded");

  fileInput?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    fileLabel.textContent = f ? `${f.name} (${f.type || "video"}), ${f.size} bytes` : "(no file)";
    if (f) log("Selected: " + f.name);
  });

  function getForm() {
    return {
      coach: coachEl?.value || "supportive",
      height: hEl?.value?.trim() || "",
      name: nameEl?.value?.trim() || "",
      email: emailEl?.value?.trim() || "",
      handicap: hcapEl?.value?.trim() || "",
      hand: handEl?.value || "Right",
      eye: eyeEl?.value || "Unknown",
      baseline: !!baseEl?.checked
    };
  }

  function validate() {
    const f = getForm();
    const heightNum = Number(f.height);
    if (!f.height || Number.isNaN(heightNum) || heightNum < 48 || heightNum > 86) {
      throw new Error("Please enter your height in inches (48–86).");
    }
    const file = fileInput?.files?.[0];
    if (!file) throw new Error("Pick a video first.");
    return { f, file };
  }

  btn?.addEventListener("click", async () => {
    busy(true);
    try {
      const { f, file } = validate();

      log("Requesting presign…");
      const pre = await fetch("/api/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, type: file.type || "video/mp4", size: file.size }),
      });
      if (!pre.ok) throw new Error("presign failed " + pre.status);
      const { url, fields, key, viewerUrl } = await pre.json();
      if (!url || !fields || !key) throw new Error("presign response malformed");

      log("Uploading to S3…");
      const fd = new FormData();
      Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
      fd.append("file", file, file.name);
      const up = await fetch(url, { method: "POST", body: fd });
      if (!up.ok) throw new Error("S3 upload failed " + up.status);

      log("Upload complete.");

      const params = new URLSearchParams({
        key,
        coach: f.coach,
        h: f.height,
        name: f.name,
        email: f.email,
        hand: f.hand,
        eye: f.eye
      });
      if (f.handicap) params.set("hcp", f.handicap);
      if (f.baseline) params.set("baseline", "1");

      const baseUrl = viewerUrl || "/report.html";
      const finalUrl = `${baseUrl}?${params.toString()}`;
      log("Opening report view…");
      location.assign(finalUrl);
    } catch (e) {
      log("Error: " + (e?.message || e));
      busy(false);
    }
  });
})();
