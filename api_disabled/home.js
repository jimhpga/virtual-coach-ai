module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const key = (req.headers["x-api-key"] || url.searchParams.get("key") || "").toString();
  const clientId = (url.searchParams.get("clientId") || "").toString();

  res.setHeader("Content-Type","text/html; charset=utf-8");
  res.status(200).send(`<!doctype html>
<meta charset="utf-8">
<title>Virtual Coach AI — Upload & Print</title>
<style>
  body{font-family:system-ui,Segoe UI,Arial;margin:24px;max-width:880px}
  .row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
  label{display:block;margin:10px 0 4px}
  input[type=text]{width:420px;padding:8px;border:1px solid #ccc;border-radius:8px}
  input[type=file]{border:1px dashed #bbb;padding:14px;border-radius:12px}
  button{padding:10px 14px;border-radius:10px;border:1px solid #ccc;cursor:pointer}
  #log{white-space:pre-wrap;background:#fafafa;border:1px solid #eee;border-radius:12px;padding:12px;margin-top:16px}
  .ok{color:#0a0}.err{color:#b00}
</style>
<h2>Virtual Coach AI — Upload & Print</h2>
<p>Pick a video/photo, we’ll upload it, write a rich report, and open a printable page.</p>

<div class="row">
  <div>
    <label>API Key</label>
    <input id="key" type="text" placeholder="vc-..." value="${key}"/>
  </div>
  <div>
    <label>Client ID</label>
    <input id="cid" type="text" placeholder="jim-hartnett" value="${clientId}"/>
  </div>
</div>

<div class="row" style="margin-top:8px">
  <div>
    <label>Note (optional)</label>
    <input id="note" type="text" placeholder="session-..." />
  </div>
  <div>
    <label>Score (0–100, optional)</label>
    <input id="score" type="text" placeholder="78" style="width:90px"/>
  </div>
</div>

<div style="margin:14px 0">
  <label>Media (mp4/mov/m4v/jpg/jpeg/png)</label>
  <input id="file" type="file" accept=".mp4,.mov,.m4v,.jpg,.jpeg,.png"/>
</div>

<button id="go">Upload & Print</button>
<pre id="log"></pre>

<script>
const el = id => document.getElementById(id);
const log = (s, cls) => { const p=document.createElement('div'); if(cls) p.className=cls; p.textContent=s; el('log').appendChild(p) };

async function uploadUsingPresign(base, key, file, clientId, note){
  const ct = file.type || (
    /\.jpe?g$/i.test(file.name) ? "image/jpeg" :
    /\.png$/i.test(file.name)  ? "image/png"  :
    /\.mp4$/i.test(file.name)  ? "video/mp4"  :
    /\.mov$/i.test(file.name)  ? "video/quicktime" :
    /\.m4v$/i.test(file.name)  ? "video/x-m4v" : "application/octet-stream"
  );
  const preBody = { filename:file.name, contentType:ct, metadata:{ clientId, note } };
  const r = await fetch(\`\/api/upload-signed\`, {
    method:"POST", headers:{ "x-api-key":key, "content-type":"application/json" },
    body: JSON.stringify(preBody)
  });
  const t = await r.text(); let pre={}; try{ pre=JSON.parse(t) }catch{ throw new Error("presign not JSON: "+t) }
  if(!r.ok || !pre.key) throw new Error("presign failed: "+t);

  if(pre.url && pre.fields){ // POST
    const fd = new FormData();
    Object.entries(pre.fields).forEach(([k,v]) => fd.append(k,v));
    fd.append("file", file);
    const up = await fetch(pre.url, { method:"POST", body:fd });
    if(!(up.status===204 || up.ok)) throw new Error("S3 POST failed: HTTP "+up.status);
    return pre.key;
  }
  if(pre.url){ // PUT
    const up = await fetch(pre.url, { method:"PUT", headers:{ "content-type":ct }, body:file });
    if(!up.ok) throw new Error("S3 PUT failed: HTTP "+up.status);
    return pre.key;
  }
  throw new Error("presign missing url/fields");
}

async function run(){
  el("log").textContent = "";
  const base = location.origin;
  const key  = el("key").value.trim();
  const cid  = el("cid").value.trim();
  const note = el("note").value.trim();
  const sc   = el("score").value.trim();
  const file = el("file").files[0];

  if(!key) return log("Missing API key","err");
  if(!cid) return log("Missing clientId","err");
  if(!file) return log("Pick a file","err");

  try{
    log("Presigning...","ok");
    const objKey = await uploadUsingPresign(base, key, file, cid, note);
    log("Upload complete: "+objKey,"ok");

    log("Writing rich report...","ok");
    const body = { clientId:cid, note, score: sc?Number(sc):undefined,
                   uploadKey:objKey, filename:file.name, contentType:file.type, bytes:file.size };
    const r2 = await fetch(\`\/api/report-from-upload\`,{
      method:"POST", headers:{ "x-api-key":key, "content-type":"application/json" },
      body: JSON.stringify(body)
    });
    const j2 = await r2.json();
    if(!r2.ok || !j2?.key) throw new Error("report failed: "+JSON.stringify(j2));
    log("Report written: "+j2.key,"ok");

    const printUrl = \`\${base}/api/print?key=\${encodeURIComponent(key)}&objKey=\${encodeURIComponent(j2.key)}\`;
    log("Opening print view...","ok");
    window.open(printUrl, "_blank", "noopener");
  }catch(e){
    console.error(e);
    log(String(e && e.message || e), "err");
  }
}
document.getElementById("go").addEventListener("click", run);
</script>`);
};

