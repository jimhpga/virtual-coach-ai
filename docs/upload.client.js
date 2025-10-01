/* Minimal, safe uploader for Virtual Coach AI
   - No inline JS required (keeps HTML clean)
   - Works with either S3 POST (policy) or S3 PUT presigners
   - After upload, calls /api/make-report then redirects to the report
*/

(function () {
  function $(sel) { return document.querySelector(sel); }
  function say(msg) {
    let el = $("#status");
    if (!el) {
      el = document.createElement("div");
      el.id = "status";
      el.style.cssText = "margin:.75rem 0;padding:.5rem .75rem;border-radius:8px;background:#0b1520;color:#cbe4ff;border:1px solid #24415f;font:14px system-ui";
      const tgt = document.body || document.documentElement;
      tgt.prepend(el);
    }
    el.textContent = String(msg);
  }
  function randId(n) {
    let s = "";
    for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  }
  function extOf(name) {
    if (!name) return ".mp4";
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i) : ".mp4";
  }
  function keyToJobId(k) {
    return String(k || "").replace(/^uploads\//, "").replace(/\.[^.]+$/, "");
  }

  async function presign(key, file) {
    const u = "/api/presign"
      + "?key=" + encodeURIComponent(key)
      + "&type=" + encodeURIComponent(file.type || "video/mp4")
      + "&size=" + encodeURIComponent(file.size || 0);
    const r = await fetch(u, { cache: "no-store" });
    if (!r.ok) throw new Error("presign failed " + r.status);
    return r.json(); // expected: { url, fields? , headers?, bucket?, region? }
  }

  async function s3Upload(p, file) {
    // Support S3 POST {url, fields} and PUT {url, headers}
    if (p && p.url && p.fields) {
      const fd = new FormData();
      for (const k in p.fields) fd.append(k, p.fields[k]);
      fd.append("file", file);
      const r = await fetch(p.url, { method: "POST", body: fd });
      if (!r.ok) throw new Error("S3 POST failed " + r.status);
      return { ok: true, location: (p.url + "/" + (p.fields && p.fields.key ? p.fields.key : "")) };
    } else if (p && p.url) {
      const hdrs = p.headers || { "Content-Type": file.type || "video/mp4" };
      const r = await fetch(p.url, { method: "PUT", body: file, headers: hdrs });
      if (!r.ok) throw new Error("S3 PUT failed " + r.status);
      return { ok: true, location: p.url };
    }
    throw new Error("presign shape not recognized");
  }

  async function makeReport(key, extras) {
    // Try GET first: /api/make-report?key=...
    const qs = new URLSearchParams({ key: key });
    if (extras && extras.bucket) qs.set("bucket", extras.bucket);
    if (extras && extras.region) qs.set("region", extras.region);
    const getUrl = "/api/make-report?" + qs.toString();

    let r = await fetch(getUrl, { cache: "no-store" });
    if (!r.ok) {
      // Fallback to POST with JSON body
      r = await fetch("/api/make-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key, bucket: extras && extras.bucket, region: extras && extras.region })
      });
    }
    if (!r.ok) throw new Error("make-report failed " + r.status);
    return r.json(); // expected: { ok, url?, id?, reportKey? }
  }

  function redirectToReport(makeReportResp, key, extras) {
    // Prefer API-provided URL
    if (makeReportResp && makeReportResp.url) {
      location.href = makeReportResp.url;
      return;
    }
    // Otherwise, build a safe default
    const jobId = keyToJobId(key);
    // If bucket/region provided (S3-backed viewer)
    if (extras && extras.bucket && extras.region) {
      const qs = new URLSearchParams({
        jobId: jobId,
        bucket: extras.bucket,
        region: extras.region
      });
      location.href = "/report/?" + qs.toString();
      return;
    }
    // Fallback to local JSON path created by server-api.mjs
    location.href = "/report/?report=/reports/" + encodeURIComponent(jobId + ".json");
  }

  async function handleFile(file) {
    if (!file) return;
    try {
      say("Preparing upload…");
      const key = "uploads/" + new Date().toISOString().replace(/[-:.TZ]/g, "") + "-" + randId(6) + extOf(file.name);
      const p = await presign(key, file);

      say("Uploading to S3… (do not close this tab)");
      await s3Upload(p, file);

      say("Processing video…");
      const m = await makeReport(key, { bucket: p.bucket, region: p.region });

      say("Opening report…");
      redirectToReport(m, key, { bucket: p.bucket, region: p.region });
    } catch (e) {
      console.error(e);
      say("Upload error: " + (e && e.message ? e.message : e));
      alert("Upload error: " + (e && e.message ? e.message : e));
    }
  }

  function boot() {
    const input = document.getElementById("file");
    if (!input) {
      console.warn("#file input not found; creating one.");
      const d = document.createElement("div");
      d.innerHTML = '<input id="file" type="file" accept="video/*">';
      document.body.prepend(d);
    }
    const el = document.getElementById("file");
    if (el && !el._bound) {
      el.addEventListener("change", function () { handleFile(el.files && el.files[0]); });
      el._bound = true;
    }
    say("Select a video to begin.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
