param(
  [string]$Root = "C:\Sites\virtual-coach-ai"
)

Write-Host "=== Virtual Coach AI – Fix /api/report + upload.html ===" -ForegroundColor Cyan
Write-Host "Root: $Root"
Set-Location $Root

# ------------------------------------------------------------
# 1) Ensure api folder exists
# ------------------------------------------------------------
$apiDir = Join-Path $Root "api"
if (-not (Test-Path $apiDir)) {
  Write-Host "[API] Creating api directory..." -ForegroundColor Yellow
  New-Item -ItemType Directory -Force -Path $apiDir | Out-Null
} else {
  Write-Host "[API] api directory exists." -ForegroundColor Green
}

# ------------------------------------------------------------
# 2) Write api\report.js
#    - GET  /api/report  -> returns template JSON (for testing)
#    - POST /api/report  -> accepts player metadata, merges into template
# ------------------------------------------------------------
$reportJsPath = Join-Path $apiDir "report.js"
$reportJs = @'
const fs = require("fs");
const path = require("path");

// Template report at: /reports/demo/report.json
// (C:\Sites\virtual-coach-ai\reports\demo\report.json)
const templatePath = path.join(__dirname, "..", "reports", "demo", "report.json");

function loadTemplate() {
  const raw = fs.readFileSync(templatePath, "utf8");
  return JSON.parse(raw);
}

// TODAY: we just merge basic player info into the template.
// LATER: this is where we call the real swing analyzer.
function buildReportFromTemplate(input) {
  const tpl = loadTemplate();

  if (!tpl.player) tpl.player = {};

  if (input.name) tpl.player.name = input.name;
  if (input.handicap) tpl.player.handicap = Number(input.handicap) || input.handicap;
  if (input.handedness) tpl.player.handedness = input.handedness;
  if (input.email) tpl.player.email = input.email;
  if (input.eyeDominance) tpl.player.eyeDominance = input.eyeDominance;
  if (input.height) tpl.player.height = input.height;
  if (input.sourceFileName) tpl.player.sourceFileName = input.sourceFileName;

  // Stamp today's date if not already present
  if (!tpl.player.date) {
    tpl.player.date = new Date().toISOString().slice(0, 10);
  }

  tpl.id = tpl.id || `swing-${Date.now()}`;

  return tpl;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Simple health / debug endpoint
  if (req.method === "GET") {
    try {
      const report = loadTemplate();
      const id = report.id || "sample-001";
      return res.status(200).json({ ok: true, reportId: id, report });
    } catch (err) {
      console.error("GET /api/report error", err);
      return res.status(500).json({ ok: false, error: "Failed to load report template." });
    }
  }

  if (req.method === "POST") {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const bodyStr = Buffer.concat(chunks).toString("utf8") || "{}";
      const input = JSON.parse(bodyStr);

      const report = buildReportFromTemplate(input);
      const id = report.id || "swing-" + Date.now();

      // For now we just return it. Frontend can decide what to do with it.
      return res.status(200).json({ ok: true, reportId: id, report });
    } catch (err) {
      console.error("POST /api/report error", err);
      return res.status(500).json({ ok: false, error: "Failed to generate report." });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed." });
};
'@

Write-Host "[API] Writing api\\report.js ..." -ForegroundColor Yellow
$reportJs | Set-Content -Path $reportJsPath -Encoding utf8
Write-Host "[API] api\\report.js updated." -ForegroundColor Green

# ------------------------------------------------------------
# 3) Replace upload.html with a working, simple flow
#    - Collect player info
#    - Hit /api/report
#    - Redirect to report.html using existing demo JSON
# ------------------------------------------------------------
$uploadPath = Join-Path $Root "upload.html"
$uploadHtml = @'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Virtual Coach AI — Upload</title>

  <style>
    :root {
      --nav:#0b2b12;
      --scrim:rgba(0,0,0,.05);
      --panel:#ffffff;
      --line:#d4dde3;
      --text:#102427;
      --muted:#647782;
      --maxw:980px;
      --radius:14px;
      --shadow:0 14px 30px rgba(0,0,0,.16);
      --accent:#00b873;
    }

    * { box-sizing:border-box; }
    html,body { height:100%; }

    body {
      margin:0;
      color:var(--text);
      font:15px/1.5 system-ui,-apple-system,"Segoe UI",Inter,Roboto,Arial,sans-serif;
      background:radial-gradient(circle at top,#f4f7f9 0,#d3dee5 40%,#c4d1da 100%);
    }

    .scrim { min-height:100vh; background:linear-gradient(to bottom,rgba(255,255,255,.75),rgba(255,255,255,.9)); }

    header.top {
      position:sticky;
      top:0;
      z-index:100;
      background:var(--nav);
      border-bottom:1px solid rgba(255,255,255,.1);
    }

    .navwrap {
      width:min(var(--maxw),94%);
      margin:0 auto;
      padding:10px 0;
      display:flex;
      gap:12px;
      align-items:center;
      justify-content:space-between;
    }

    .brand {
      display:flex;
      align-items:center;
      gap:10px;
      color:#fff;
      text-decoration:none;
      font-weight:800;
    }

    .brand-logo { height:36px; width:auto; display:block; }

    .menu-toggle {
      display:none;
      align-items:center;
      gap:8px;
      color:#fff;
      background:transparent;
      border:1px solid rgba(255,255,255,.3);
      border-radius:10px;
      padding:6px 10px;
      cursor:pointer;
      font:inherit;
    }

    nav.nav { display:flex; gap:8px; }

    nav.nav a {
      color:#fff;
      text-decoration:none;
      padding:8px 10px;
      border-radius:10px;
      border:1px solid transparent;
      white-space:nowrap;
      font-size:14px;
    }

    nav.nav a:hover { background:rgba(255,255,255,.08); }

    nav.nav a[aria-current="page"] {
      border-color:rgba(255,255,255,.18);
      background:rgba(255,255,255,.10);
    }

    @media (max-width:820px) {
      .menu-toggle { display:inline-flex; }
      nav.nav{
        position:absolute;
        right:0;
        top:100%;
        background:var(--nav);
        border-bottom:1px solid rgba(255,255,255,.1);
        display:none;
        flex-direction:column;
        padding:8px;
      }
      header.top.open nav.nav{ display:flex; }
    }

    main {
      width:min(var(--maxw),94%);
      margin:0 auto;
      padding:18px 0 40px;
    }

    .card {
      background:var(--panel);
      border-radius:var(--radius);
      border:1px solid rgba(0,0,0,.05);
      box-shadow:var(--shadow);
      padding:18px 18px 20px;
    }

    .card h1 {
      margin:0 0 4px;
      font-size:1.3rem;
    }

    .subtitle {
      font-size:13px;
      color:var(--muted);
      margin-bottom:12px;
    }

    .grid {
      display:grid;
      gap:10px;
    }

    @media (min-width:860px) {
      .grid {
        grid-template-columns:repeat(3,minmax(0,1fr));
      }
    }

    label {
      font-size:13px;
      font-weight:600;
      display:block;
      margin-bottom:3px;
    }

    input[type="text"],
    input[type="email"],
    input[type="number"],
    select {
      width:100%;
      padding:7px 9px;
      border-radius:8px;
      border:1px solid var(--line);
      font:inherit;
    }

    input[type="file"] {
      font-size:13px;
    }

    .actions {
      margin-top:14px;
      display:flex;
      gap:10px;
      align-items:center;
      flex-wrap:wrap;
    }

    .btn {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:6px;
      border-radius:999px;
      border:1px solid var(--accent);
      background:var(--accent);
      color:#fff;
      padding:8px 16px;
      font-weight:600;
      cursor:pointer;
      font-size:14px;
    }

    .btn[disabled] {
      opacity:.65;
      cursor:default;
    }

    .muted { color:var(--muted); font-size:13px; }

    #status {
      font-size:13px;
      color:var(--muted);
    }

    footer {
      width:min(var(--maxw),94%);
      margin:10px auto 26px;
      text-align:center;
      color:#8da0aa;
      font-size:12px;
    }
  </style>
</head>
<body>
<header class="top" id="site-header">
  <div class="navwrap">
    <a class="brand" href="index.html" aria-label="Virtual Coach AI">
      <img src="virtualcoach-logo.png" alt="Virtual Coach AI" class="brand-logo" />
      <span>Virtual Coach AI</span>
    </a>

    <button class="menu-toggle" id="menuBtn" aria-expanded="false" type="button">Menu ▾</button>

    <nav class="nav" id="siteNav" aria-label="Primary navigation">
      <a href="index.html">Home</a>
      <a href="upload.html">Upload</a>
      <a href="report.html?report=reports/demo/report.json">Reports</a>
      <a href="coming-soon.html">Coming&nbsp;Soon</a>
      <a href="pricing.html">Pricing</a>
      <a href="faq.html">FAQ</a>
      <a href="contact.html">Contact</a>
      <a href="login.html">Login</a>
    </nav>
  </div>
</header>

<div class="scrim">
  <main>
    <section class="card">
      <h1>Upload → Report → Improve</h1>
      <div class="subtitle">
        Select a swing video, add a few details, and we’ll generate a Virtual Coach AI report.
      </div>

      <form id="uploadForm">
        <div class="grid">
          <div>
            <label for="playerName">Name (optional)</label>
            <input id="playerName" name="playerName" type="text" placeholder="e.g., Jordan Smith" />
          </div>

          <div>
            <label for="email">Email (optional)</label>
            <input id="email" name="email" type="email" placeholder="you@example.com" />
          </div>

          <div>
            <label for="handicap">Handicap (optional)</label>
            <input id="handicap" name="handicap" type="number" step="0.1" placeholder="e.g., 8.2" />
          </div>

          <div>
            <label for="hand">Hand (optional)</label>
            <select id="hand" name="hand">
              <option value="">— choose —</option>
              <option value="right">Right-handed</option>
              <option value="left">Left-handed</option>
            </select>
          </div>

          <div>
            <label for="eye">Eye dominance (optional)</label>
            <select id="eye" name="eye">
              <option value="">— choose —</option>
              <option value="right">Right-eye dominant</option>
              <option value="left">Left-eye dominant</option>
              <option value="central">Central / mixed</option>
            </select>
          </div>

          <div>
            <label for="height">Height (optional)</label>
            <input id="height" name="height" type="text" placeholder="e.g., 5'10&quot; or 178 cm" />
          </div>
        </div>

        <div style="margin-top:12px">
          <label for="swingFile">Swing video</label>
          <input id="swingFile" name="swingFile" type="file" accept="video/*" required />
          <div class="muted" style="margin-top:4px">
            Any face-on or down-the-line swing clip works for now.
          </div>
        </div>

        <div class="actions">
          <button class="btn" id="submitBtn" type="submit">
            Upload &amp; Generate Report
          </button>
          <span id="status" class="muted"></span>
        </div>
      </form>
    </section>
  </main>

  <footer>© <span id="y"></span> Virtual Coach AI. All rights reserved.</footer>
</div>

<script>
  // Year
  document.getElementById("y").textContent = new Date().getFullYear();

  // Hamburger
  const headerEl = document.getElementById("site-header");
  const menuBtn = document.getElementById("menuBtn");
  const navEl = document.getElementById("siteNav");

  menuBtn.addEventListener("click", () => {
    const open = headerEl.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  navEl.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      headerEl.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    }
  });

  // Highlight current nav item
  const current = (location.pathname.split("/").pop() || "upload.html")
    .split("?")[0]
    .toLowerCase();
  document.querySelectorAll("nav.nav a").forEach((a) => {
    const href = (a.getAttribute("href") || "").split("?")[0].toLowerCase();
    if (href === current) a.setAttribute("aria-current", "page");
  });

  // Upload flow: call /api/report, then go to report.html
  const form = document.getElementById("uploadForm");
  const statusEl = document.getElementById("status");
  const submitBtn = document.getElementById("submitBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById("swingFile");
    const file = fileInput.files[0];
    if (!file) {
      statusEl.textContent = "Please choose a swing video first.";
      return;
    }

    const payload = {
      name: document.getElementById("playerName").value.trim(),
      email: document.getElementById("email").value.trim(),
      handicap: document.getElementById("handicap").value.trim(),
      handedness: document.getElementById("hand").value,
      eyeDominance: document.getElementById("eye").value,
      height: document.getElementById("height").value.trim(),
      sourceFileName: file.name
    };

    statusEl.textContent = "Uploading and analyzing swing…";
    submitBtn.disabled = true;

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Bad response");

      // For now we just send them to the existing demo report.
      // Your existing report.html already knows how to read ?report=...
      const encodedName = encodeURIComponent(payload.name || "");
      const extra = encodedName ? "&player=" + encodedName : "";
      window.location.href = "report.html?report=reports/demo/report.json" + extra;
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Sorry, there was a problem generating your report.";
      submitBtn.disabled = false;
    }
  });
</script>
</body>
</html>
'@

Write-Host "[UPLOAD] Writing upload.html ..." -ForegroundColor Yellow
$uploadHtml | Set-Content -Path $uploadPath -Encoding utf8
Write-Host "[UPLOAD] upload.html updated." -ForegroundColor Green

# ------------------------------------------------------------
# 4) Quick sanity checks
# ------------------------------------------------------------
Write-Host "`n[CHECK] Key files:" -ForegroundColor Cyan
"  api\report.js   -> " + (Test-Path $reportJsPath)
"  upload.html     -> " + (Test-Path $uploadPath)

# ------------------------------------------------------------
# 5) Deploy to Vercel (production)
# ------------------------------------------------------------
Write-Host "`n[DEPLOY] Deploying to Vercel (prod)..." -ForegroundColor Cyan
vercel deploy --prod --yes

Write-Host "`nDone. Go hit /upload.html on your production URL and test the flow." -ForegroundColor Cyan
