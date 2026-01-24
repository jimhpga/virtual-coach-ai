param(
  [Parameter(Mandatory=$true)]
  [string]$Video
)

$ErrorActionPreference = "Stop"
Set-Location C:\Sites\virtual-coach-ai

if (!(Test-Path $Video)) { throw "Video not found: $Video" }

# 1) Patch UI crashers first
powershell -ExecutionPolicy Bypass -File .\Fix-FullClient-NullMaps.ps1

# 2) Pose output path
$outDir = "C:\Sites\virtual-coach-ai\pose\out"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$poseOut = Join-Path $outDir ("pose_{0}.json" -f (Get-Date -Format yyyyMMdd_HHmmss))

# 3) Run pose estimation (sample 200 frames for speed)
$poseScript = "C:\Sites\virtual-coach-ai\scripts\pose_estimate.py"
if (!(Test-Path $poseScript)) { throw "Missing: $poseScript" }

Write-Host "`n=== POSE ESTIMATION ===" -ForegroundColor DarkGray
Write-Host ("Video: {0}" -f $Video) -ForegroundColor DarkGray
Write-Host ("Out:   {0}" -f $poseOut) -ForegroundColor DarkGray

python $poseScript --in $Video --out $poseOut --sample 200

if (!(Test-Path $poseOut)) { throw "Pose did not write output: $poseOut" }

# 4) Build report json
Write-Host "`n=== BUILD REPORT JSON ===" -ForegroundColor DarkGray
powershell -ExecutionPolicy Bypass -File .\Build-LatestReport-FromPose.ps1 -PoseJson $poseOut -OutJson "C:\Sites\virtual-coach-ai\public\data\latest-report.json"

# 5) Tell you the URL
Write-Host "`n✅ OPEN THIS:" -ForegroundColor Green
Write-Host "http://localhost:3000/report-beta/full?src=/data/latest-report.json" -ForegroundColor Cyan
