param(
  [Parameter(Mandatory=$true)][string]$Video,
  [Parameter(Mandatory=$false)][string]$Out,
  [int]$Every = 1,
  [double]$MinConf = 0.3,
  [int]$ModelComplexity = 1
)

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$venv = Join-Path $here ".venv"
$py = Join-Path $venv "Scripts\python.exe"

if (-not (Test-Path $venv)) {
  Write-Host "Creating venv at $venv" -ForegroundColor Cyan
  python -m venv $venv
}

if (-not (Test-Path $py)) {
  throw "Python venv missing python.exe at: $py"
}

Write-Host "Installing requirements..." -ForegroundColor Cyan
& $py -m pip install --upgrade pip
& $py -m pip install -r (Join-Path $here "requirements.txt")

if (-not $Out -or $Out.Trim() -eq "") {
  $base = [IO.Path]::GetFileNameWithoutExtension($Video)
  $Out = Join-Path $here ("out\{0}.pose.json" -f $base)
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Out) | Out-Null

Write-Host "Running pose extraction..." -ForegroundColor Green
Write-Host "  Video: $Video"
Write-Host "  Out:   $Out"

& $py (Join-Path $here "extract_pose.py") `
  --video "$Video" `
  --out "$Out" `
  --every $Every `
  --min_conf $MinConf `
  --model_complexity $ModelComplexity

Write-Host "DONE. Pose JSON: $Out" -ForegroundColor Yellow
