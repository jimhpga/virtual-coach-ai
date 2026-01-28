param(
  [Parameter(Mandatory=$true)][string]$InVideo,
  [Parameter(Mandatory=$true)][string]$ModelTask,
  [int]$Sample = 900,
  [double]$Alpha = 0.45,
  [int]$MaxGap = 2,
  [double]$VisMin = 0.0,
  [double]$PresMin = 0.0
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# E:\ storage (prefer env, fallback)
$VCA_CACHE = [Environment]::GetEnvironmentVariable("VCA_CACHE","User")
if([string]::IsNullOrWhiteSpace($VCA_CACHE)){ $VCA_CACHE = "E:\VCA\Cache" }
$OutDir = Join-Path $VCA_CACHE "pose-out"
New-Item -ItemType Directory -Force $OutDir | Out-Null

if(-not (Test-Path $InVideo)){ throw "Missing InVideo: $InVideo" }
if(-not (Test-Path $ModelTask)){ throw "Missing ModelTask: $ModelTask" }

$stamp = Get-Date -Format yyyyMMdd_HHmmss
$rawJson = Join-Path $OutDir ("pose_{0}.json" -f $stamp)
$smJson  = $rawJson -replace '\.json$', ("_smoothed_a{0}_gap{1}.json" -f ($Alpha.ToString("0.##").Replace('.','')), $MaxGap)

Write-Host "`n=== POSE ESTIMATE (RAW) ===" -ForegroundColor Cyan
Write-Host "IN : $InVideo" -ForegroundColor Yellow
Write-Host "OUT: $rawJson" -ForegroundColor Yellow
Write-Host "SAMPLE: $Sample" -ForegroundColor Yellow

$sw = [Diagnostics.Stopwatch]::StartNew()
python .\scripts\pose_estimate_tasks.py --in "$InVideo" --out "$rawJson" --model "$ModelTask" --sample $Sample
if(-not (Test-Path $rawJson)){
  throw "Output RAW missing: $rawJson"
}
$sw.Stop()
Write-Host "✅ Raw pose JSON wrote in $($sw.Elapsed.ToString())" -ForegroundColor Green

Write-Host "`n=== QC BEFORE ===" -ForegroundColor Cyan
python .\scripts\pose_qc.py "$rawJson"

Write-Host "`n=== SMOOTH ===" -ForegroundColor Cyan
python .\scripts\pose_smooth.py "$rawJson" "$smJson" $Alpha $MaxGap $VisMin $PresMin
if(-not (Test-Path $smJson)){
  throw "Smoothing claimed success but output file missing: $smJson"
}

Write-Host "`n=== QC AFTER ===" -ForegroundColor Cyan
python .\scripts\pose_qc.py "$smJson"

Write-Host "`n✅ DONE" -ForegroundColor Green
# Save for fast reuse (session + user)
$env:VCA_LAST_POSE_RAW = $rawJson
$env:VCA_LAST_POSE_SMOOTHED = $smJson
[Environment]::SetEnvironmentVariable("VCA_LAST_POSE_RAW", $rawJson, "User")
[Environment]::SetEnvironmentVariable("VCA_LAST_POSE_SMOOTHED", $smJson, "User")
Write-Host "RAW     : $rawJson" -ForegroundColor Yellow
Write-Host "SMOOTHED: $smJson" -ForegroundColor Yellow


