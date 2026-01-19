param(
  [Parameter(Mandatory=$true)]
  [string]$Video,
  [int]$Fps = 30,
  [switch]$Force
)

function Fail($msg) { Write-Host ""; Write-Host "❌ $msg" -ForegroundColor Red; exit 1 }
function Ok($msg)   { Write-Host "✅ $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function ToolPath($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($null -eq $cmd) { return $null }
  return $cmd.Source
}

if (!(Test-Path ".\package.json")) {
  Warn "You don't look like you're in the repo root (no package.json found)."
  Warn "If you're not already there, run:  cd C:\Sites\virtual-coach-ai"
}

try { $VideoFull = (Resolve-Path $Video).Path } catch { Fail "Video not found: $Video" }
Ok "Video: $VideoFull"

$node = ToolPath "node"
$npm  = ToolPath "npm"
$py   = ToolPath "python"
$ff   = ToolPath "ffmpeg"

if (!$node) { Fail "node not found. Install Node LTS, then reopen PowerShell." }
if (!$npm)  { Fail "npm not found. Node install usually includes it." }
if (!$ff)   { Fail "ffmpeg not found. Easiest: winget install Gyan.FFmpeg" }
if (!$py)   { Warn "python not found. Pose step will be a placeholder only." }

Ok ("node: " + (& node -v))
Ok ("npm : " + (& npm -v))
Ok ("ffmpeg: " + (& ffmpeg -version | Select-Object -First 1))
if ($py) { Ok ("python: " + (& python --version)) }

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$runRoot = Join-Path ".\data\pose" "run-$stamp"
if ((Test-Path $runRoot) -and !$Force) { Fail "Run folder exists: $runRoot (use -Force)" }

New-Item -ItemType Directory -Force -Path $runRoot | Out-Null
$framesDir = Join-Path $runRoot "frames"
New-Item -ItemType Directory -Force -Path $framesDir | Out-Null

$metaPath  = Join-Path $runRoot "meta.json"
$posePath  = Join-Path $runRoot "poses.json"
$logPath   = Join-Path $runRoot "ffmpeg.log"

[ordered]@{
  createdAt = (Get-Date).ToString("o")
  video = $VideoFull
  fps = $Fps
  repo = (Resolve-Path ".").Path
} | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $metaPath

Ok "Run folder: $runRoot"
Write-Host ""
Write-Host "🎞️  Extracting frames at $Fps fps..." -ForegroundColor Cyan

$ffArgs = @(
  "-y",
  "-i", $VideoFull,
  "-vf", "fps=$Fps",
  "-q:v", "2",
  (Join-Path $framesDir "frame_%06d.jpg")
)

& ffmpeg @ffArgs 1> $logPath 2>&1
if ($LASTEXITCODE -ne 0) { Fail "ffmpeg failed. See: $logPath" }

$frameCount = (Get-ChildItem $framesDir -Filter *.jpg -ErrorAction SilentlyContinue).Count
if ($frameCount -lt 5) { Fail "Too few frames ($frameCount). See: $logPath" }
Ok "Extracted frames: $frameCount"

Write-Host ""
Write-Host "🦴 Pose step (placeholder)..." -ForegroundColor Cyan

$poses = @()
$frames = Get-ChildItem $framesDir -Filter *.jpg | Sort-Object Name
$i = 0
foreach ($f in $frames) {
  $i++
  if (($i % 50) -eq 0) {
    $pct = [math]::Round(($i / $frameCount) * 100, 1)
    Write-Progress -Activity "Building poses.json" -Status "$pct% ($i/$frameCount)" -PercentComplete $pct
  }
  $poses += [pscustomobject]@{
    frame = $f.Name
    t = [math]::Round(($i - 1) / $Fps, 5)
    landmarks = @()
  }
}
Write-Progress -Activity "Building poses.json" -Completed

[pscustomobject]@{
  schema = "vca.pose.placeholder.v1"
  video = $VideoFull
  fps = $Fps
  framesDir = (Resolve-Path $framesDir).Path
  count = $frameCount
  poses = $poses
} | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $posePath

Ok "Wrote: $posePath"
Ok "Frames: $framesDir"
Ok "Log: $logPath"
Write-Host "==================== DONE ====================" -ForegroundColor Green
