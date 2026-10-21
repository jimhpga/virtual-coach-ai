[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ShotDir,
  [Parameter(Mandatory=$false)][string]$OutDir,
  [switch]$VerboseDebug
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$p){
  if(-not (Test-Path -LiteralPath $p)){
    New-Item -ItemType Directory -Path $p | Out-Null
  }
}

function NormDeg([double]$d){
  while($d -gt 180){ $d -= 360 }
  while($d -lt -180){ $d += 360 }
  return [Math]::Round($d,2)
}

function PickPhase($arr,[string]$phase){
  $hit = @($arr | Where-Object { $_ -and ($_.phase -eq $phase) })
  if($hit.Count -eq 0){ return $null }
  return $hit[0]
}

function Pick-ShaftFile([string]$dir){
  $v2 = Get-ChildItem -LiteralPath $dir -File -Filter "VCA_shaft_FINAL_V2*.json" -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch '(?i)\.meta\.json$' } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if($v2){ return $v2 }

  return Get-ChildItem -LiteralPath $dir -File -Filter "VCA_shaft_FINAL*.json" -ErrorAction SilentlyContinue |
         Where-Object { $_.Name -notmatch '(?i)\.meta\.json$' } |
         Sort-Object LastWriteTime -Descending | Select-Object -First 1
}

function To-NullableDouble($v){
  if($null -eq $v){ return $null }
  try { return [double]$v } catch { return $null }
}

function To-NullableInt($v){
  if($null -eq $v){ return $null }
  try { return [int]$v } catch { return $null }
}

function Build-Phase($row,[string]$phase){
  if($null -eq $row){
    return [pscustomobject]@{
      phase=$phase; available=$false; frame=$null
      handDeg=$null; shaftDeg=$null; deltaDeg=$null
      conf=0; shaftLine=$null; shaftSource="unavailable"
      why="Missing phase data."
    }
  }

  $source = ""
  try { $source = [string]$row.shaft.source } catch {}

  $conf = 0
  try {
    if($null -ne $row.shaft.confidenceRaw){
      $conf = [int]$row.shaft.confidenceRaw
    }
  } catch { $conf = 0 }

  $shaftDeg = $null
  try {
    if($source -ne "unavailable" -and $conf -gt 0 -and $null -ne $row.shaft.angleDeg){
      $shaftDeg = NormDeg([double]$row.shaft.angleDeg)
    }
  } catch { $shaftDeg = $null }

  $handDeg = To-NullableDouble $row.handPlaneDeg
  if($null -ne $handDeg){ $handDeg = NormDeg([double]$handDeg) }

  $deltaDeg = $null
  if($null -ne $shaftDeg -and $null -ne $handDeg){
    $deltaDeg = NormDeg(([double]$shaftDeg)-([double]$handDeg))
  }

  $line = $null
  try {
    if($null -ne $shaftDeg){ $line = $row.shaft.vision.line }
  } catch {}

  $why = ""
  try { $why = [string]$row.shaft.why } catch {}

  return [pscustomobject]@{
    phase=$phase
    available=($null -ne $shaftDeg)
    frame=To-NullableInt $row.frame
    handDeg=$handDeg
    shaftDeg=$shaftDeg
    deltaDeg=$deltaDeg
    conf=$conf
    shaftLine=$line
    shaftSource=$source
    why=$why
  }
}

if(-not $OutDir){ $OutDir = Join-Path $ShotDir "_mirror" }
Ensure-Dir $OutDir

$shaftFile = Pick-ShaftFile $ShotDir
if(-not $shaftFile){ throw "No VCA_shaft_FINAL*.json found in: $ShotDir" }
if($VerboseDebug){ Write-Host ("Using: " + $shaftFile.FullName) -ForegroundColor Cyan }

$data = Get-Content -LiteralPath $shaftFile.FullName -Raw | ConvertFrom-Json
if(-not ($data -is [System.Collections.IEnumerable]) -or ($data -is [string])){
  throw "Expected VCA_shaft_FINAL JSON to be an ARRAY. Got: $($data.GetType().FullName)"
}

$p3 = Build-Phase (PickPhase $data "P3") "P3"
$p5 = Build-Phase (PickPhase $data "P5") "P5"

$handMatch = $null
$shaftMatch = $null
$deltaMatch = $null

if($null -ne $p3.handDeg -and $null -ne $p5.handDeg){
  $handMatch = NormDeg(([double]$p5.handDeg)-([double]$p3.handDeg))
}
if($null -ne $p3.shaftDeg -and $null -ne $p5.shaftDeg){
  $shaftMatch = NormDeg(([double]$p5.shaftDeg)-([double]$p3.shaftDeg))
}
if($null -ne $p3.deltaDeg -and $null -ne $p5.deltaDeg){
  $deltaMatch = NormDeg(([double]$p5.deltaDeg)-([double]$p3.deltaDeg))
}

$hasShaft = ($p3.available -and $p5.available)
$hasFullMirror = ($null -ne $handMatch -and $null -ne $shaftMatch -and $null -ne $deltaMatch)

$mirror = [pscustomobject]@{
  ok = $hasShaft
  status = if($hasFullMirror){ "ok" } elseif($hasShaft){ "shaft_only" } else { "missing" }
  meta = @{
    created=(Get-Date).ToString("s")
    source=$shaftFile.Name
    note="Confidence-aware P3/P5 mirror. Missing inputs remain null; no null-to-zero coercion."
  }
  P3 = $p3
  P5 = $p5
  symmetry = @{
    handMatchDeg=$handMatch
    shaftMatchDeg=$shaftMatch
    deltaMatchDeg=$deltaMatch
  }
}

$outJson = Join-Path $OutDir "P3_P5_Mirror.json"
($mirror | ConvertTo-Json -Depth 16) | Set-Content -LiteralPath $outJson -Encoding UTF8
Write-Host ("Created: " + $outJson) -ForegroundColor Green

if($VerboseDebug){
  Write-Host ("status=" + $mirror.status) -ForegroundColor Yellow
  Write-Host ("P3 shaft=" + $p3.shaftDeg + " hand=" + $p3.handDeg + " conf=" + $p3.conf) -ForegroundColor Cyan
  Write-Host ("P5 shaft=" + $p5.shaftDeg + " hand=" + $p5.handDeg + " conf=" + $p5.conf) -ForegroundColor Cyan
}
