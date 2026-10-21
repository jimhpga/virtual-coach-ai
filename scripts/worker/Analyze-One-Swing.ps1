param(
  [Parameter(Mandatory=$true)]
  [string]$Video,

  [string]$OutDir = "",

  [switch]$WorkerDebug
)

$ErrorActionPreference = "Stop"

$Repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Analyzer = Join-Path $PSScriptRoot "vca_analyze_local.py"

if (-not (Test-Path -LiteralPath $Video)) {
  throw "Video not found: $Video"
}

if (-not $OutDir) {
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $name = [IO.Path]::GetFileNameWithoutExtension($Video)
  $safe = ($name -replace '[^a-zA-Z0-9_-]', '_')
  $OutDir = "E:\VCA\_runs\one_swing\${safe}_${stamp}"
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$argsList = @(
  $Analyzer,
  "--video", (Resolve-Path -LiteralPath $Video).Path,
  "--outDir", $OutDir,
  "--repo", $Repo
)

if ($WorkerDebug) {
  $argsList += "--debug"
}

Write-Host "VCA ONE-SWING ANALYSIS"
Write-Host "Video : $Video"
Write-Host "Output: $OutDir"
Write-Host ""

& python @argsList
if ($LASTEXITCODE -ne 0) {
  throw "VCA one-swing analysis failed with exit code $LASTEXITCODE"
}

$patch = Join-Path $OutDir "report_patch.json"
if (-not (Test-Path $patch)) {
  throw "Worker finished without report_patch.json"
}

$j = Get-Content $patch -Raw | ConvertFrom-Json

[pscustomobject]@{
  Ok                   = $true
  AnalysisStatus       = $j.analysisStatus
  AnalysisEngine       = $j.analysisEngine
  P7Frame              = $j.phaseFrames.P7
  ShaftMeasuredPhases  = (($j.shaftV2.measuredPhases) -join ",")
  DeliveryStatus       = $j.p5p6p7ShaftArm.status
  DeliveryConfidence   = $j.p5p6p7ShaftArm.confidenceMin
  DeliveryQualityValid = $j.deliveryCard.quality.isValid
  ReportPatch          = $patch
  OutputDirectory      = $OutDir
} | Format-List
