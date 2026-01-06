param(
  [string]$ProjectRoot = "C:\Sites\virtual-coach-ai",
  [string]$BackupRoot  = "C:\Backups"
)

$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$p) {
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
}

function Stamp() { (Get-Date).ToString("yyyyMMdd_HHmmss") }

function Die([string]$msg) { throw $msg }

# ---- MAIN ----
if (-not (Test-Path $ProjectRoot)) { Die "ProjectRoot not found: $ProjectRoot" }

# Hard sanity check: must have package.json at root
if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
  Die "No package.json at ProjectRoot. You're pointing at the wrong folder: $ProjectRoot"
}

$ts = Stamp
Ensure-Dir $BackupRoot

$staging = Join-Path $BackupRoot ("_staging_vca_{0}" -f $ts)
$zip     = Join-Path $BackupRoot ("virtual-coach-ai_{0}.zip" -f $ts)

# Clean staging if somehow exists
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }

Ensure-Dir $staging

Write-Host "ROOT: $ProjectRoot" -ForegroundColor Cyan
Write-Host "STAGE: $staging" -ForegroundColor Cyan
Write-Host "ZIP: $zip" -ForegroundColor Cyan

# Include these folders if they exist
$includeDirs = @("app","pages","scripts","public","types","lambda")
# Include these files if they exist
$includeFiles = @(
  "package.json","package-lock.json","pnpm-lock.yaml","yarn.lock",
  "next.config.js","next.config.mjs","tsconfig.json","vercel.json",
  ".env.example",".env.local.example",
  "README.md"
)

# Exclusions
$xd = @(
  ".next","node_modules",".venv","dist","out","coverage",
  ".git",".github",
  "logs","log","tmp","temp",
  "_backup","_backups","backups",
  "public\uploads","public\frames"
)

# Copy folders
foreach($d in $includeDirs){
  $srcDir = Join-Path $ProjectRoot $d
  if (Test-Path $srcDir) {
    $dstDir = Join-Path $staging $d
    Ensure-Dir $dstDir | Out-Null

    $args = @(
      $srcDir, $dstDir,
      "/E","/R:1","/W:1","/NFL","/NDL","/NJH","/NJS","/NP","/XJ"
    )

    foreach($ex in $xd){
      $leaf = $ex.Split("\")[0]
      $args += @("/XD", $leaf)
    }

    robocopy @args | Out-Null
    Write-Host ("✅ Staged folder: {0}" -f $d) -ForegroundColor Green
  } else {
    Write-Host ("⚠️ Missing folder (skipped): {0}" -f $d) -ForegroundColor Yellow
  }
}

# Copy files
foreach($f in $includeFiles){
  $srcFile = Join-Path $ProjectRoot $f
  if (Test-Path $srcFile) {
    Copy-Item $srcFile -Destination (Join-Path $staging $f) -Force
    Write-Host ("✅ Staged file: {0}" -f $f) -ForegroundColor Green
  }
}

# ---- Validate staging BEFORE zip ----
$mustHaveAny = @("app","pages","scripts","public","types")
$presentCount = 0
foreach($d in $mustHaveAny){
  if (Test-Path (Join-Path $staging $d)) {
    $cnt = (Get-ChildItem (Join-Path $staging $d) -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
    if ($cnt -gt 0) { $presentCount++ }
  }
}

if ($presentCount -lt 2) {
  Write-Host "❌ Staging looks wrong (too empty). Showing staging tree:" -ForegroundColor Red
  Get-ChildItem $staging -Directory | Select-Object Name, FullName | Format-Table
  Die "Aborting zip: staging folder does not contain expected app code."
}

Write-Host "✅ Staging validation passed." -ForegroundColor Green

# ---- Zip the staging folder ----
if (Test-Path $zip) { Remove-Item $zip -Force }

Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zip -Force -CompressionLevel Optimal

# Final sanity check: open zip and count key folders
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($zip)

$counts = [pscustomobject]@{
  zip = $zip
  app = ($z.Entries | Where-Object { $_.FullName -like "app/*" }).Count
  pages = ($z.Entries | Where-Object { $_.FullName -like "pages/*" }).Count
  scripts = ($z.Entries | Where-Object { $_.FullName -like "scripts/*" }).Count
  public = ($z.Entries | Where-Object { $_.FullName -like "public/*" }).Count
  types = ($z.Entries | Where-Object { $_.FullName -like "types/*" }).Count
  next = ($z.Entries | Where-Object { $_.FullName -like ".next/*" }).Count
  node_modules = ($z.Entries | Where-Object { $_.FullName -like "node_modules/*" }).Count
  venv = ($z.Entries | Where-Object { $_.FullName -like ".venv/*" }).Count
}
$z.Dispose()

Write-Host "ZIP CONTENT COUNTS:" -ForegroundColor Cyan
$counts | Format-List

Write-Host "✅ Backup created: $zip" -ForegroundColor Green

# Optional: delete staging
Remove-Item $staging -Recurse -Force
Write-Host "🧹 Staging removed: $staging" -ForegroundColor DarkGray
