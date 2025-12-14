param(
  [Parameter(Mandatory)]
  [string]$VideoPath,

  [Parameter(Mandatory)]
  [string]$OutDir
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Get-ImpactMotionSec {
  param([string]$VideoPath)

  $frameDir = Join-Path $env:TEMP ("frames_" + [guid]::NewGuid())
  New-Item -ItemType Directory -Force $frameDir | Out-Null

  & ffmpeg -hide_banner -loglevel quiet -nostats `
    -i "$VideoPath" `
    -vf "fps=60,scale=320:-1" `
    "$frameDir/%05d.jpg" 2>$null | Out-Null

  $files = Get-ChildItem $frameDir -Filter *.jpg | Sort-Object Name
  if ($files.Count -lt 20) {
    Remove-Item $frameDir -Recurse -Force
    throw "Not enough frames for motion analysis."
  }

  $start = 60
  if ($start -ge $files.Count) { $start = 1 }
  $end = $files.Count - 2

  $maxDelta = 0
  $impactFrame = $start

  for ($i = $start; $i -le $end; $i++) {
    $a = Get-Content $files[$i-1].FullName -Encoding Byte
    $b = Get-Content $files[$i].FullName   -Encoding Byte

    $delta = 0
    for ($j = 0; $j -lt $a.Length; $j += 80) {
      $delta += [math]::Abs([int]$a[$j] - [int]$b[$j])
    }

    if ($delta -gt $maxDelta) {
      $maxDelta = $delta
      $impactFrame = $i
    }
  }

  Remove-Item $frameDir -Recurse -Force
  return [math]::Round($impactFrame / 60.0, 3)
}

function Get-Ptimes {
  param([double]$ImpactSec)

  $raw = [ordered]@{
    P1 = $ImpactSec - 0.72
    P2 = $ImpactSec - 0.60
    P3 = $ImpactSec - 0.48
    P4 = $ImpactSec - 0.36
    P5 = $ImpactSec - 0.20
    P6 = $ImpactSec - 0.10
    P7 = $ImpactSec
    P8 = $ImpactSec + 0.08
    P9 = $ImpactSec + 0.20
  }

  $pt = [ordered]@{}
  foreach($k in $raw.Keys){
    $pt[$k] = [math]::Round([math]::Max([double]$raw[$k], 0), 3)
  }
  return $pt
}

function Extract-Frame {
  param(
    [string]$VideoPath,
    [double]$Sec,
    [string]$OutFile
  )

  $t = [math]::Max($Sec, 0)

  & ffmpeg -y -hide_banner -loglevel quiet -nostats `
    -ss $t `
    -i "$VideoPath" `
    -frames:v 1 `
    -update 1 `
    "$OutFile" 2>$null | Out-Null
}

if (-not (Test-Path $VideoPath)) { throw "VideoPath not found: $VideoPath" }

New-Item -ItemType Directory -Force $OutDir | Out-Null

$impact = Get-ImpactMotionSec $VideoPath
$ptimes = Get-Ptimes $impact

foreach ($k in $ptimes.Keys) {
  $out = Join-Path $OutDir ($k.ToLower() + ".jpg")
  Extract-Frame $VideoPath $ptimes[$k] $out
}

[pscustomobject]@{
  ok        = $true
  impactSec = $impact
  ptimes    = $ptimes
  outDir    = $OutDir
} | ConvertTo-Json -Depth 5
