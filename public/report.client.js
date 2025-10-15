// /public/report.client.js (v4 - verbose + robust)
(function () {
  const $ = (s) => document.querySelector(s);
  const set = (id, v) => { const el = $(`#${id}`); if (el) el.textContent = v ?? "—"; };
  const showErr = (m) => { const e = $("#error"); if (e) e.textContent = m; console.error("[report]", m); };
  const say = (m) => { console.log("[report]", m); };

  // Params
  const q = new URLSearchParams(location.search);
  const id = q.get("id");
  const directUrl = q.get("url"); // fallback: direct JSON URL
  const base = (window.BLOB_PUBLIC_BASE || "").replace(/\/+$/, "");

  // Build URL
  let reportUrl = null;
  if (directUrl) {
    reportUrl = directUrl;
    say("Using direct url= param");
  } else if (id && base) {
    reportUrl = `${base}/reports/${encodeURIComponent(id)}.json`;
    say(`Using id param -> ${reportUrl}`);
  } else {
    return showErr("Missing report id. Open this page as /report.html?id=<reportId> or pass &url=<full-json-url>.");
  }

  // Fetch JSON
  async function fetchReport() {
    say("Fetching:", reportUrl);
    const r = await fetch(reportUrl, { cache: "no-store" });
    if (!r.ok) throw new Error(`Fetch ${r.status} for ${reportUrl}`);
    return r.json();
  }

  function render(r) {
    set("score", r.swingScore);
    set("status", r.status);
    set("created", r.created);

    const playerWrap = $("#player");
    const processing = $("#processing");
    playerWrap.textContent = "";
    processing.textContent = "";

    if (r.muxPlaybackId) {
      const player = document.createElement("mux-player");
      player.setAttribute("stream-type", "on-demand");
      player.setAttribute("playsinline", "");
      player.style.width = "100%";
      player.style.maxWidth = "820px";
      player.style.aspectRatio = "16/9";
      player.setAttribute("playback-id", r.muxPlaybackId);
      playerWrap.replaceChildren(player);
    } else if (r.muxUploadId) {
      processing.textContent = "Processing video… it will load automatically.";
    } else {
      processing.textContent = "No video available.";
    }
  }

  async function resolveIfNeeded(r) {
    if (r.muxPlaybackId || !r.muxUploadId) return false;
    try {
      const resp = await fetch("/api/resolve-mux", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, uploadId: r.muxUploadId })
      }).then(x => x.json());
      say("resolve-mux:", resp);
      return resp?.status === "ready" ? resp.playbackId : false;
    } catch (e) { say("resolve-mux error", e); return false; }
  }

  (async () => {
    try {
      let rep = await fetchReport();
      say("Loaded JSON:", rep);
      render(rep);

      // Tiny poller to patch in playback id
      if (!rep.muxPlaybackId && rep.muxUploadId) {
        const t = setInterval(async () => {
          const playback = await resolveIfNeeded(rep);
          if (playback) {
            rep = await fetchReport();
            render(rep);
            clearInterval(t);
          }
        }, 4000);
      }
    } catch (e) {
      showErr("Failed to load report: " + (e?.message || e));
    }
  })();
})();
