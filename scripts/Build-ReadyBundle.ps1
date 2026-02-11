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
$shaftFile     = Get-LatestFile -Dir $ShotDir -Pattern "VCA_shaft_FINAL_*.json"
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
foreach($p in $shaftPhases){
  if($p.shaft -and ($p.shaft.PSObject.Properties.Name -contains "confidenceRaw")){
    $confVals += [double]$p.shaft.confidenceRaw
  } elseif($p.PSObject.Properties.Name -contains "Conf"){
    $confVals += [double]$p.Conf
  }
}
$shaftConf = if($confVals.Count -gt 0){ [Math]::Round((($confVals | Measure-Object -Average).Average / 100.0), 2) } else { 0.50 }

$shaftOut = [ordered]@{
  source     = "shaft_pipeline"
  confidence = $shaftConf
  phases     = $shaftPhases
  notes      = @(
    "Shaft plane is relative to target line; default target line is P1 shaft vector.",
    "Impact may be slightly higher than address due to lean + droop + rotation.",
    "P6 is Moment of Truth; face condition at P6 dictates required body behavior at impact."
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
  showShaft     = $true
  showXFactor   = $true
  showP6Card    = $true
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
