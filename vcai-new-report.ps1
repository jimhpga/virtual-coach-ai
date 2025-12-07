Param()

$ErrorActionPreference = "Stop"

# Repo root = folder where this script lives
$root       = Split-Path -Parent $MyInvocation.MyCommand.Path
$reportsDir = Join-Path $root "_ai-reports"
$webDir     = Join-Path $root "public\reports\players"
$prod       = "https://virtual-coach-ai-tau.vercel.app"

Write-Host "`n=== Virtual Coach AI – New Live Report ===" -ForegroundColor Cyan

# ---- Player info prompts ----
$name = Read-Host "Player name (e.g., Jordan Smith)"
if ([string]::IsNullOrWhiteSpace($name)) {
  Write-Host "Name is required. Aborting." -ForegroundColor Red
  exit 1
}

$hand = Read-Host "Handedness (Right/Left) [default: Right]"
if ([string]::IsNullOrWhiteSpace($hand)) { $hand = "Right" }

$eye = Read-Host "Eye dominance (Right/Left/Central) [default: Right]"
if ([string]::IsNullOrWhiteSpace($eye)) { $eye = "Right" }

$hcp = Read-Host "Handicap [default: 10]"
if ([string]::IsNullOrWhiteSpace($hcp)) { $hcp = "10" }

$height = Read-Host "Height (e.g., 5-10 or 178 cm) [optional]"
$notes  = Read-Host "Any quick notes (miss pattern, goals) [optional]"

# ---- Build JSON body for /api/report ----
$bodyObj = @{
  name     = $name
  hand     = $hand
  eye      = $eye
  handicap = $hcp
  height   = $height
  notes    = $notes
}

$bodyJson = $bodyObj | ConvertTo-Json -Depth 4

Write-Host "`nCalling /api/report (OpenAI live)..." -ForegroundColor Yellow

$response = Invoke-WebRequest `
  -Uri "$prod/api/report" `
  -Method POST `
  -Body $bodyJson `
  -ContentType 'application/json'

$data = $response.Content | ConvertFrom-Json

if (-not $data.ok) {
  Write-Host "`nAPI error:" -ForegroundColor Red
  $data | ConvertTo-Json -Depth 8
  exit 1
}

Write-Host "Mode:   $($data.mode)"   -ForegroundColor Green
Write-Host "Player: $($data.player)" -ForegroundColor Green

if (-not $data.report) {
  Write-Host "No report payload returned from API." -ForegroundColor Red
  exit 1
}

# ---- Ensure folders exist ----
foreach ($dir in @($reportsDir, $webDir)) {
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
}

# ---- Save archive + web copy with unique filename ----
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$slug  = ($name -replace '[^\w\-]', '_')
if ([string]::IsNullOrWhiteSpace($slug)) { $slug = "player" }
$baseName = "$stamp-$slug.json"

$archiveFile = Join-Path $reportsDir $baseName
$webFile     = Join-Path $webDir $baseName

$data.report | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 $archiveFile
Copy-Item $archiveFile $webFile -Force

$webPath = "reports/players/$baseName"
$viewUrl = "$prod/report.html?report=$webPath"

Write-Host "`nSaved archive:" -ForegroundColor Green
Write-Host "  $archiveFile"
Write-Host "Published web copy:" -ForegroundColor Green
Write-Host "  $webFile"

# ---- Deploy so the new JSON is live ----
Write-Host "`nDeploying to Vercel..." -ForegroundColor Yellow
vercel deploy --prod --yes

Write-Host "`n=== Live report ready ===" -ForegroundColor Cyan
Write-Host "URL:" -ForegroundColor Green
Write-Host "  $viewUrl`n"

# Try to open in browser
try {
  Start-Process $viewUrl | Out-Null
} catch {
  Write-Host "(Couldn't auto-open browser; paste the URL above.)" -ForegroundColor DarkYellow
}
