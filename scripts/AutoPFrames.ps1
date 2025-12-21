param(
  [Parameter(Mandatory=$true)][string]$VideoPath,
  [Parameter(Mandatory=$true)][string]$OutDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-VideoDurationSec {
  param([string]$Path)

  $durText = & ffprobe -v error -show_entries format=duration `
    -of default=noprint_wrappers=1:nokey=1 "$Path" 2>$null

  $durText = ($durText | Out-String).Trim()
  if (-not $durText -or $durText -match '[^0-9\.\-]') { throw "ffprobe duration not numeric: [$durText]" }

  return [double]::Parse($durText, [System.Globalization.CultureInfo]::InvariantCulture)
}

function Clamp {
  param([double]$x,[double]$a,[double]$b)
  return [Math]::Min([Math]::Max($x,$a),$b)
}

function Get-VideoStreamMeta {
  param([string]$Path)

  $j = & ffprobe -v error `
    -select_streams v:0 `
    -show_entries stream=avg_frame_rate,nb_frames,r_frame_rate `
    -of json "$Path" 2>$null

  if (-not $j) { throw "ffprobe stream meta failed" }

  $meta = $j | ConvertFrom-Json
  $s = $meta.streams[0]

  $fpsFrac = if ($s.avg_frame_rate -and $s.avg_frame_rate -ne "0/0") { $s.avg_frame_rate } else { $s.r_frame_rate }
  if (-not $fpsFrac) { throw "Could not read FPS from ffprobe." }

  $fps = [double](& powershell -NoProfile -Command "$fpsFrac")  # safe eval for "30000/1001"
  $nb  = $null
  try { $nb = [int]$s.nb_frames } catch { $nb = $null }

  return [pscustomobject]@{ fps = $fps; nbFrames = $nb; fpsFrac = $fpsFrac }
}

function ExtractFrameAtTime {
  param([string]$Video,[double]$Sec,[string]$OutFile)
  $t = [Math]::Max($Sec, 0)
  & ffmpeg -y -hide_banner -loglevel error `
    -ss $t `
    -i "$Video" `
    -frames:v 1 `
    -q:v 2 `
    "$OutFile" 2>$null | Out-Null
}

if (-not (Test-Path $VideoPath)) { throw "VideoPath not found: $VideoPath" }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$dur = Get-VideoDurationSec $VideoPath
$meta = Get-VideoStreamMeta $VideoPath
$fps  = $meta.fps

# ---- Window detection (same heuristic as before) ----
$impactGuess    = Clamp ($dur * 0.77) 0.2 ($dur - 0.2)
$winStart       = Clamp ($impactGuess - 0.80) 0.0 ($dur - 0.01)
$winEnd         = Clamp ($impactGuess + 0.30) 0.01 $dur
$winLen         = $winEnd - $winStart
$usedFallback   = $false

if ($winLen -lt 0.80 -or $winLen -gt 1.30) {
  $usedFallback = $true
  $winStart = Clamp ($impactGuess - 0.55) 0.0 ($dur - 1.0)
  $winEnd   = Clamp ($winStart + 1.0) 0.01 $dur
  $winLen   = $winEnd - $winStart
}

# ---- FRAME-BASED sampling (slow-mo safe) ----
$winStartFrame = [int][Math]::Round($winStart * $fps)
$winEndFrame   = [int][Math]::Round($winEnd   * $fps)
$winFrames     = [int]($winEndFrame - $winStartFrame)
if ($winFrames -lt 9) { $winFrames = 9 } # safety

$stepFrames = [Math]::Max([int][Math]::Floor($winFrames / 8), 1)

$times  = @{}
$frames = @{}

for ($i=0; $i -lt 9; $i++) {
  $label = "P$($i+1)"
  $frame = $winStartFrame + ($stepFrames * $i)
  $sec   = Clamp ($frame / $fps) 0.0 ($dur - 0.001)

  $times[$label] = [Math]::Round($sec, 3)

  $outFile = Join-Path $OutDir ("p$($i+1).jpg")
  ExtractFrameAtTime $VideoPath $sec $outFile

  $frames[$label] = $outFile
}

$result = @{
  ok = $true
  videoPath = $VideoPath
  durationSec = [Math]::Round($dur,3)
  meta = @{
    fps = [Math]::Round($fps,3)
    fpsFrac = $meta.fpsFrac
    nbFrames = $meta.nbFrames
  }
  window = @{
    start = [Math]::Round($winStart,3)
    end   = [Math]::Round($winEnd,3)
    len   = [Math]::Round($winLen,3)
    impactGuess = [Math]::Round($impactGuess,3)
    fallbackUsed = $usedFallback
    startFrame = $winStartFrame
    endFrame   = $winEndFrame
    framesLen  = $winFrames
    stepFrames = $stepFrames
  }
  times  = $times
  frames = $frames
}

$result | ConvertTo-Json -Depth 6
