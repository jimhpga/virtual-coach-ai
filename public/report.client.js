(async function () {
  const q = new URLSearchParams(location.search);
  const id = q.get("id");
  const $ = (s) => document.querySelector(s);

  if (!id) { $("#error").textContent = "Missing report id"; return; }

  const base = (window.BLOB_PUBLIC_BASE || "").replace(/\/+$/,"");
  if (!base) { $("#error").textContent = "BLOB_PUBLIC_BASE not configured"; return; }

  const reportUrl = `${base}/reports/${id}.json`;

  async function fetchReport() {
    const r = await fetch(reportUrl, { cache: "no-store" });
    if (!r.ok) throw new Error(`Report not found (${r.status})`);
    return r.json();
  }

  function render(r){
    $("#score").textContent = r.swingScore ?? "—";
    $("#status").textContent = r.status ?? "—";
    $("#created").textContent = r.created ?? "—";

    if (r.muxPlaybackId) {
      const player = document.createElement("mux-player");
      player.setAttribute("stream-type", "on-demand");
      player.setAttribute("playsinline", "");
      player.setAttribute("style", "width:100%;max-width:820px;aspect-ratio:16/9;");
      player.setAttribute("playback-id", r.muxPlaybackId);
      $("#player").replaceChildren(player);
      $("#processing").textContent = "";
    } else {
      $("#player").textContent = "";
      $("#processing").textContent = r.muxUploadId
        ? "Processing video… it will load automatically."
        : "No video available.";
    }
  }

  async function resolveIfNeeded(r) {
    if (r.muxPlaybackId || !r.muxUploadId) return false;
    try {
      const resp = await fetch("/api/resolve-mux", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, uploadId: r.muxUploadId })
      }).then(r => r.json());
      return resp?.status === "ready" ? resp.playbackId : false;
    } catch { return false; }
  }

  try {
    let rep = await fetchReport();
    render(rep);

    if (!rep.muxPlaybackId && rep.muxUploadId) {
      const timer = setInterval(async () => {
        const playback = await resolveIfNeeded(rep);
        if (playback) {
          rep = await fetchReport();  // re-fetch patched JSON
          render(rep);
          clearInterval(timer);
        }
      }, 4000);
    }
  } catch (e) {
    $("#error").textContent = String(e.message || e);
  }
})();
