function $(id){return document.getElementById(id)}
const fileInput = $("fileInput");
const fileLabel = $("fileLabel");
const uploadBtn = $("uploadBtn");
const logEl     = $("log");

function log(msg){
  logEl.textContent += "\n" + msg;
  logEl.scrollTop = logEl.scrollHeight;
}
function busy(b){ uploadBtn.disabled = b; fileInput.disabled = b; }

window.addEventListener("error", e => log("JS error: " + (e.message || e.error)));

fileInput.addEventListener("change", ()=>{
  const f = fileInput.files && fileInput.files[0];
  fileLabel.textContent = f ? (f.name + " (" + (f.type||"unknown") + " " + f.size + " bytes)") : "(no file)";
  if (f) log("Selected: " + f.name + " type=" + f.type + " size=" + f.size);
});

uploadBtn.addEventListener("click", async ()=>{
  const file = fileInput.files && fileInput.files[0];
  if (!file){ log("No file selected"); return; }

  busy(true);
  try{
    log("Step 1: asking backend for presigned POST?");
    const pres = await fetch("/api/presign", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ filename:file.name, type:file.type })
    });
    const pjson = await pres.json();
    if (!pres.ok || !pjson.url) throw new Error("presign failed " + pres.status + " " + JSON.stringify(pjson));
    const { url, fields, key } = pjson;
    log("Presign OK. Uploading to S3?");

    const form = new FormData();
    Object.keys(fields).forEach(k => form.append(k, fields[k]));
    form.append("Content-Type", file.type || "video/mp4");
    form.append("file", file);

    const up = await fetch(url, { method:"POST", body: form });
    if (!(up.status === 201 || up.status === 204 || up.ok)) {
      const txt = await up.text().catch(()=> "");
      throw new Error("S3 upload failed " + up.status + " " + txt);
    }
    log("Upload complete (OK)");

    log("Step 3: creating report?");
    const mk = await fetch("/api/make-report", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ s3_key:key, name:file.name, type:file.type, size:file.size })
    });
    const mj = await mk.json();
    if (!mk.ok) throw new Error("make-report failed " + mk.status + " " + JSON.stringify(mj));
    log("Report response: " + JSON.stringify(mj));

    const viewerUrl = mj.viewerUrl || "/report/?report=/reports/latest.json";
    log("Opening viewer: " + viewerUrl);
    setTimeout(()=> location.href = viewerUrl, 800);
  }catch(err){
    log("Error: " + (err && err.message ? err.message : String(err)));
    console.error(err);
    busy(false);
  }
});
