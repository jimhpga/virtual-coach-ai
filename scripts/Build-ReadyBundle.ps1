param(
  [Parameter(Mandatory=$true)][string]$ShotDir,
  [string]$Root = "C:\Sites\virtual-coach-ai"
)

$ErrorActionPreference="Stop"
Set-StrictMode -Version Latest

function Get-LatestFile {
  param([string]$Dir, [string]$Pattern)
  $f = Get-ChildItem $Dir -File -Filter $Pattern -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
  return $f
}

function Read-Json {
  param([string]$Path)
  if(-not (Test-Path $Path)){ throw "Missing JSON: $Path" }
  return (Get-Content $Path -Raw | ConvertFrom-Json)
}

function Get-AlignmentAngles {
  param($alignment)

  # Try the common shapes we’ve seen:
  $props = $alignment.PSObject.Properties.Name

  if($props -contains "anglesDeg"){ return $alignment.anglesDeg }
  if($props -contains "angles"){ return $alignment.angles }
  if($props -contains "angles_deg"){ return $alignment.angles_deg }
  if($props -contains "anglesDegrees"){ return $alignment.anglesDegrees }

  # Sometimes wrapped:
  if($props -contains "alignment"){
    $a = $alignment.alignment
    if($a){
      $ap = $a.PSObject.Properties.Name
      if($ap -contains "anglesDeg"){ return $a.anglesDeg }
      if($ap -contains "angles"){ return $a.angles }
      if($ap -contains "angles_deg"){ return $a.angles_deg }
    }
  }

  # Sometimes already flat — build an angles object
  $flatKeys = @("feetAim","hipsAim","shouldersAim","bodyAimAvg")
  $hasFlat = $true
  foreach($k in $flatKeys){
    if(-not ($props -contains $k)){ $hasFlat = $false; break }
  }
  if($hasFlat){
    return [ordered]@{
      feetAim      = $alignment.feetAim
      hipsAim      = $alignment.hipsAim
      shouldersAim = $alignment.shouldersAim
      bodyAimAvg   = $alignment.bodyAimAvg
    }
  }

  # Nothing matched
  throw "Alignment JSON shape unknown (no anglesDeg/angles/flat keys). Keys: " + ($props -join ", ")
}

function Ensure-SourceAndConfidence {
  param($Obj, [string]$defaultSource, [double]$defaultConfidence = 0.0)

  $props = $Obj.PSObject.Properties.Name
  if($props -notcontains "source"){
    $Obj | Add-Member -NotePropertyName source -NotePropertyValue $defaultSource
  }

  $props = $Obj.PSObject.Properties.Name
  $hasConf = ($props -contains "confidence") -or ($props -contains "confidenceRaw") -or ($props -contains "confidenceStable")
  if(-not $hasConf){
    $Obj | Add-Member -NotePropertyName confidence -NotePropertyValue $defaultConfidence
  }
  return $Obj
}

function Test-VcaMetricObject {
  param($Obj, [string]$Label)
  if(-not $Obj){ throw "❌ $Label is null" }
  $props = $Obj.PSObject.Properties.Name
  if($props -notcontains "source"){ throw "❌ Missing .source on $Label" }
  $hasConf = ($props -contains "confidence") -or ($props -contains "confidenceRaw") -or ($props -contains "confidenceStable")
  if(-not $hasConf){ throw "❌ Missing confidence field on $Label" }
}

function Test-VcaReadyBundle {
  param($Bundle)
  foreach($k in @("meta","toggles","alignment","shaft","xfactor")){
    if(-not ($Bundle.PSObject.Properties.Name -contains $k)){
      throw "❌ Bundle missing key: $k"
    }
  }
  Test-VcaMetricObject -Obj $Bundle.alignment -Label "bundle.alignment"
  Test-VcaMetricObject -Obj $Bundle.shaft     -Label "bundle.shaft"
  Test-VcaMetricObject -Obj $Bundle.xfactor   -Label "bundle.xfactor"
}

if(-not (Test-Path $ShotDir)){ throw "Missing ShotDir: $ShotDir" }

$alignmentFile = Get-LatestFile -Dir $ShotDir -Pattern "alignment_p1_*.json"
$xfactorFile   = Get-LatestFile -Dir $ShotDir -Pattern "XFACTOR_key_phases_*.json"

# Prefer confidence-aware Grip Anchor V1 + Shaft V2 outputs.
# Exclude sidecar *.meta.json files; consumers need the legacy-array-compatible phase file.
$shaftFile = Get-ChildItem -LiteralPath $ShotDir -File -Filter "VCA_shaft_FINAL_V2_*.json" -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -notmatch '(?i)\.meta\.json$' } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if(-not $shaftFile){
  $shaftFile = Get-ChildItem -LiteralPath $ShotDir -File -Filter "VCA_shaft_FINAL_*.json" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch '(?i)\.meta\.json$' } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}
if(-not $shaftFile){ $shaftFile = Get-LatestFile -Dir $ShotDir -Pattern "VCA_shaft_keypoints_*.json" }

if(-not $alignmentFile){ throw "Missing alignment_p1_*.json in $ShotDir" }
if(-not $xfactorFile){ throw "Missing XFACTOR_key_phases_*.json in $ShotDir" }
if(-not $shaftFile){ throw "Missing VCA_shaft_FINAL_*.json OR VCA_shaft_keypoints_*.json in $ShotDir" }

Write-Host "=== Inputs ===" -ForegroundColor Yellow
Write-Host ("Alignment: {0}" -f $alignmentFile.FullName) -ForegroundColor Cyan
Write-Host ("XFactor  : {0}" -f $xfactorFile.FullName)   -ForegroundColor Cyan
Write-Host ("Shaft    : {0}" -f $shaftFile.FullName)     -ForegroundColor Cyan

$alignment = Read-Json $alignmentFile.FullName
$xfactor   = Read-Json $xfactorFile.FullName
$shaftRaw  = Read-Json $shaftFile.FullName

# ALIGNMENT
$alignmentOut = [ordered]@{
  source     = "pose_alignment_p1"
  confidence = if($alignment.PSObject.Properties.Name -contains "confidence"){ [double]$alignment.confidence } else { 0.85 }
  anglesDeg  = (Get-AlignmentAngles -alignment $alignment)
  notes      = "Alignment Intent derived from feet/hips/shoulders at P1 (2D proxy)."
}

# SHAFT
$shaftPhases = @()
if($shaftRaw -is [System.Array]){ $shaftPhases = $shaftRaw } else { $shaftPhases = @($shaftRaw) }

$confVals = @()
$measuredShaftPhases = @()
$unavailableShaftPhases = @()

foreach($p in $shaftPhases){
  $phaseLabel = if($p.PSObject.Properties.Name -contains "phase"){ [string]$p.phase } else { "unknown" }
  $src = if($p.shaft -and ($p.shaft.PSObject.Properties.Name -contains "source")){ [string]$p.shaft.source } else { "" }
  $conf = $null

  if($p.shaft -and ($p.shaft.PSObject.Properties.Name -contains "confidenceRaw")){
    $conf = [double]$p.shaft.confidenceRaw
  } elseif($p.PSObject.Properties.Name -contains "Conf"){
    $conf = [double]$p.Conf
  }

  if($null -ne $conf -and $conf -gt 0 -and $src -ne "unavailable"){
    $confVals += $conf
    $measuredShaftPhases += $phaseLabel
  } else {
    $unavailableShaftPhases += $phaseLabel
  }
}

$shaftMeasuredCount = $measuredShaftPhases.Count
$shaftTotalCount = $shaftPhases.Count
$shaftCoverage = if($shaftTotalCount -gt 0){ [Math]::Round($shaftMeasuredCount / $shaftTotalCount, 2) } else { 0 }
$shaftMeasuredConfidence = if($confVals.Count -gt 0){ [Math]::Round((($confVals | Measure-Object -Average).Average / 100.0), 2) } else { 0 }

# Overall confidence combines detector confidence with measurement coverage.
$shaftConf = [Math]::Round($shaftMeasuredConfidence * $shaftCoverage, 2)
$isV2 = $shaftFile.Name -like "VCA_shaft_FINAL_V2_*"

$shaftOut = [ordered]@{
  source             = if($isV2){ "vision_grip_anchor_v2" } else { "shaft_pipeline_legacy" }
  confidence         = $shaftConf
  measuredConfidence = $shaftMeasuredConfidence
  coverage           = $shaftCoverage
  measuredPhases     = @($measuredShaftPhases)
  unavailablePhases  = @($unavailableShaftPhases)
  phases             = $shaftPhases
  notes              = @(
    "Shaft measurements are shown only when both the hand/grip anchor and shaft vision pass confidence gates.",
    "Unavailable phases remain unavailable; V2 does not substitute a forearm proxy as measured shaft geometry.",
    "P5-P7 delivery measurements should be interpreted with their phase-level confidence."
  )
}

# XFACTOR
$xfConf = 0.60
if($xfactor.PSObject.Properties.Name -contains "xFactor"){
  if($xfactor.xFactor -and ($xfactor.xFactor.PSObject.Properties.Name -contains "confidence")){
    $xfConf = [double]$xfactor.xFactor.confidence
  }
}
$xfOut = [ordered]@{
  source     = "pose_xfactor_proxy"
  confidence = $xfConf
  phases     = $xfactor.phases
  xFactor    = $xfactor.xFactor
  notes      = "X-Factor is a 2D proxy: shouldersAcrossDeg - hipsAcrossDeg (normalized)."
}

# Ensure fields
$alignmentOut = Ensure-SourceAndConfidence -Obj $alignmentOut -defaultSource "pose_alignment_p1" -defaultConfidence 0.85
$shaftOut     = Ensure-SourceAndConfidence -Obj $shaftOut     -defaultSource "shaft_pipeline"     -defaultConfidence 0.50
$xfOut        = Ensure-SourceAndConfidence -Obj $xfOut        -defaultSource "pose_xfactor_proxy" -defaultConfidence 0.60

$toggles = [ordered]@{
  showAlignment = $true
  showShaft     = ($shaftMeasuredCount -gt 0)
  showXFactor   = $true
  showP6Card    = ($measuredShaftPhases -contains "P6")
}

$defsVersion = $null
$defsPath = Join-Path (Join-Path $Root "_defs") "VCA_MEASUREMENT_DEFINITIONS.json"
if(Test-Path $defsPath){
  try { $defsVersion = (Read-Json $defsPath).version } catch { $defsVersion = $null }
}

$bundle = [ordered]@{
  meta = [ordered]@{
    createdAt   = (Get-Date).ToString("s")
    shotDir     = $ShotDir
    defsVersion = $defsVersion
  }
  toggles   = $toggles
  alignment = $alignmentOut
  shaft     = $shaftOut
  xfactor   = $xfOut
}

$tmp = $bundle | ConvertTo-Json -Depth 18
$bundleObj = $tmp | ConvertFrom-Json
Test-VcaReadyBundle -Bundle $bundleObj

$outPath = Join-Path $ShotDir ("ready_report_bundle_{0}.json" -f (Get-Date).ToString("yyyy-MM-dd"))
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outPath, $tmp, $utf8NoBom)

Write-Host "`n✅ Wrote Ready Report Bundle:" -ForegroundColor Green
Write-Host $outPath -ForegroundColor Cyan

Write-Host "`n=== Confidence Summary ===" -ForegroundColor Yellow
[pscustomobject]@{
  Alignment = $bundle.alignment.confidence
  Shaft     = $bundle.shaft.confidence
  XFactor   = $bundle.xfactor.confidence
} | Format-Table -Auto
