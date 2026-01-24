(() => {
  const $ = (id) => document.getElementById(id);

  const form = $("uploadForm");
  const fileInput = $("videoFile");
  const statusEl = $("status");
  const errEl = $("error");

  function showError(msg) {
    errEl.textContent = msg;
    errEl.style.display = "block";
    statusEl.style.display = "none";
  }

  function showStatus(msg) {
    statusEl.textContent = msg;
    statusEl.style.display = "block";
    errEl.style.display = "none";
  }

  async function postForm(url, formData) {
    const res = await fetch(url, { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    // Persist server-side usable upload URL for downstream tools (pose, report, etc.)
    try {
      const u = data.uploadUrl || data.url || data.videoUrl || data.video_url;
      if (u && typeof window !== "undefined" && window.sessionStorage) {
        sessionStorage.setItem("vca_video_upload_url", String(u));
      }
    } catch {}
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    // Persist server-side usable upload URL for downstream APIs (pose, clips, etc.)
    if (data && data.uploadUrl && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("vca_video_upload_url", data.uploadUrl);
    }
    return data;
  }

  async function postJson(url, obj) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obj)
    });
    const data = await res.json().catch(() => ({}));
    // Persist server-side usable upload URL for downstream tools (pose, report, etc.)
    try {
      const u = data.uploadUrl || data.url || data.videoUrl || data.video_url;
      if (u && typeof window !== "undefined" && window.sessionStorage) {
        sessionStorage.setItem("vca_video_upload_url", String(u));
      }
    } catch {}
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    // Persist server-side usable upload URL for downstream APIs (pose, clips, etc.)
    if (data && data.uploadUrl && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("vca_video_upload_url", data.uploadUrl);
    }
    return data;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const f = fileInput.files && fileInput.files[0];
    if (!f) return showError("Pick a video first.");

    try {
      showStatus("Uploading…");

      const fd = new FormData();
      fd.append("video", f);

      const up = await postForm("/api/upload", fd);

      showStatus(`Uploaded (${up.durationSec.toFixed(1)}s). Auto-detecting impact + extracting P1-P9…`);

      const ex = await postJson("/api/extract-pframes", { videoUrl: up.videoUrl, jobId: up.jobId });

      // store for the next page
      sessionStorage.setItem("vca_jobId", ex.jobId);
      sessionStorage.setItem("vca_videoUrl", ex.videoUrl);
      sessionStorage.setItem("vca_impactSec", String(ex.impactSec || ""));
      sessionStorage.setItem("vca_frames", JSON.stringify(ex.frames || {}));
      sessionStorage.setItem("vca_ptimes", JSON.stringify(ex.ptimes || {}));

      showStatus("Done. Sending you to your strip…");
      window.location.href = `/strip?jobId=${encodeURIComponent(ex.jobId)}`;
    } catch (err) {
      showError(err.message || "Network error. Try again.");
    }
  });
})();


