(function () {
  const form = document.querySelector("#upload-form");
  const input = document.querySelector("#file");
  const log = (m) => (document.querySelector("#log").textContent = m ?? "");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = input.files?.[0];
    if (!file) return (log("Choose a video first."));

    try {
      log("Requesting Mux upload URL…");
      const { upload } = await fetch("/api/mux-direct-upload", { method: "POST" }).then(r => r.json());
      if (!upload?.url) throw new Error("No Mux upload URL");

      log("Uploading to Mux (this can take a minute)...");
      const put = await fetch(upload.url, { method: "PUT", body: file });
      if (!put.ok) throw new Error(`Mux upload failed (${put.status})`);

      log("Saving report JSON…");
      const rep = await fetch("/api/save-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "ready",
          swingScore: 80,
          muxPlaybackId: null,     // not known yet
          muxUploadId: upload.id,  // used by tiny poller
          p1p9: [],
          faults: [],
          note: `uploaded ${file.name}`
        })
      }).then(r => r.json());

      if (!rep?.id) throw new Error("Report save failed");
      location.href = `/report?id=${encodeURIComponent(rep.id)}`;
    } catch (err) {
      log(String(err?.message || err));
    }
  });
})();
