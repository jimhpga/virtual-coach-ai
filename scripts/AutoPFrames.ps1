param(
  [Parameter(Mandatory=$true)][string]$VideoPath,
  [Parameter(Mandatory=$true)][string]$OutDir,
  [int]$ImpactFrame = 0,

  # window around impact (seconds)
  [double]$PreSeconds  = 1.00,
  [double]$PostSeconds = 0.40,

  # sampling fps for impact auto-detect (lower = faster)
  [int]$DetectFps = 30
)

$ErrorActionPreference = "Stop"

# 🔒 Signature so we can confirm you're running the right script
$ScriptSignature = "AutoPFrames_v2026-01-04_P7_EQUALS_IMPACT"

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path $Path)) { New-Item -ItemType Directory -Force -Path $Path | Out-Null }
}

function Get-VideoMeta([string]$Path) {
  $ffp = "ffprobe"
  $json = & $ffp -v error -of json `
    -select_streams v:0 `
    -show_entries stream=avg_frame_rate,nb_frames,r_frame_rate `
    -show_entries format=duration `
    "$Path" 2>$null

  if (-not $json) { throw "ffprobe failed (no output)." }
  $o = $json | ConvertFrom-Json
  $s = $o.streams[0]
  $dur = 0.0
  try { $dur = [double]$o.format.duration } catch { $dur = 0.0 }

  $fpsFrac = $s.avg_frame_rate
  if (-not $fpsFrac -or $fpsFrac -eq "0/0") { $fpsFrac = $s.r_frame_rate }
  if (-not $fpsFrac) { throw "Could not read frame rate from ffprobe." }

  $parts = $fpsFrac -split "/"
  $num = [double]$parts[0]
  $den = [double]$parts[1]
  if ($den -eq 0) { throw "Invalid fps fraction: $fpsFrac" }
  $fps = $num / $den

  $nb = $null
  try { $nb = [int]$s.nb_frames } catch { $nb = $null }

  return [pscustomobject]@{
    fps      = $fps
    fpsFrac  = $fpsFrac
    nbFrames = $nb
    duration = $dur
  }
}

function Get-ImpactFrameAuto([string]$Path, [double]$OrigFps, [int]$SampleFps) {
  # Heuristic: motion spike around impact using difference blend + signalstats
  $ff = "ffmpeg"
  $vf = "fps=$SampleFps,scale=160:-1,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG"
  $cmd = @(
    "-hide_banner","-loglevel","error",
    "-i", $Path,
    "-an",
    "-vf", $vf,
    "-f","null","-"
  )

  $stderr = & $ff @cmd 2>&1 | Out-String

  $rx = [regex]'frame:(\d+).*?lavfi\.signalstats\.YAVG=([0-9.]+)'
  $matches = $rx.Matches($stderr)
  if ($matches.Count -lt 10) { return 0 }

  $bestFrame = 0
  $bestVal = -1.0
  foreach ($m in $matches) {
    $f = [int]$m.Groups[1].Value
    $v = [double]$m.Groups[2].Value
    if ($v -gt $bestVal) { $bestVal = $v; $bestFrame = $f }
  }

  return [int][Math]::Round($bestFrame * ($OrigFps / [double]$SampleFps))
}

function Extract-FrameJpg([string]$Video, [int]$FrameNumber, [string]$OutFile) {
  & ffmpeg -y -hide_banner -loglevel error `
    -i "$Video" `
    -vf ("select=eq(n\,{0})" -f $FrameNumber) `
    -frames:v 1 `
    "$OutFile" | Out-Null
}

# ---------------- MAIN ----------------
if (-not (Test-Path $VideoPath)) { throw "VideoPath not found: $VideoPath" }
Ensure-Dir $OutDir

$meta = Get-VideoMeta $VideoPath
$fps = [double]$meta.fps

$nbFrames = $meta.nbFrames
if (-not $nbFrames -or $nbFrames -le 0) {
  if ($meta.duration -le 0) { throw "Could not determine nb_frames or duration." }
  $nbFrames = [int][Math]::Floor($meta.duration * $fps)
}

# Determine impact frame
if ($ImpactFrame -le 0) {
  $ImpactFrame = Get-ImpactFrameAuto -Path $VideoPath -OrigFps $fps -SampleFps $DetectFps
  if ($ImpactFrame -le 0) { $ImpactFrame = [int][Math]::Round($nbFrames / 2) }
}

# Clamp
$maxFrame = [int]($nbFrames - 1)
if ($ImpactFrame -lt 0) { $ImpactFrame = 0 }
if ($ImpactFrame -gt $maxFrame) { $ImpactFrame = $maxFrame }

# Build window around impact (mostly pre, a little post)
$preFrames  = [int][Math]::Round($fps * $PreSeconds)
$postFrames = [int][Math]::Round($fps * $PostSeconds)

$startFrame = [int][Math]::Max(0, ($ImpactFrame - $preFrames))
$endFrame   = [int][Math]::Min($maxFrame, ($ImpactFrame + $postFrames))

# Ensure window has some size
if (($endFrame - $startFrame) -lt 20) {
  $pad = [int][Math]::Ceiling((20 - ($endFrame - $startFrame)) / 2)
  $startFrame = [int][Math]::Max(0, ($startFrame - $pad))
  $endFrame   = [int][Math]::Min($maxFrame, ($endFrame + $pad))
}

# ✅ Rule: P7 = impact always
# P1..P6 evenly spaced from start -> (impact-1)
# P8 midway from (impact+1) -> end (if possible)
# P9 = end (or impact+1 if end == impact)
$framesOut = @()

$preEnd = [int][Math]::Max($startFrame, ($ImpactFrame - 1))
$preSpan = [int][Math]::Max(1, ($preEnd - $startFrame))

for ($i = 1; $i -le 6; $i++) {
  $t = ($i - 1) / 5.0
  $fn = [int][Math]::Round($startFrame + ($preSpan * $t))
  if ($fn -ge $ImpactFrame) { $fn = [int][Math]::Max($startFrame, ($ImpactFrame - 1)) }
  $framesOut += [pscustomobject]@{ p = $i; label = "P$i"; frame = $fn; file = ("p{0}.jpg" -f $i) }
}

$framesOut += [pscustomobject]@{ p = 7; label = "P7"; frame = $ImpactFrame; file = "p7.jpg" }

$postStart = [int][Math]::Min($maxFrame, ($ImpactFrame + 1))
if ($postStart -le $ImpactFrame) { $postStart = $ImpactFrame } # safety

$p9Frame = $endFrame
if ($p9Frame -le $ImpactFrame -and $ImpactFrame -lt $maxFrame) { $p9Frame = $ImpactFrame + 1 }

$postEnd = [int][Math]::Max($postStart, $p9Frame)
$postSpan = [int][Math]::Max(1, ($postEnd - $postStart))

$p8Frame = [int][Math]::Round($postStart + ($postSpan * 0.50))

# Force post-impact ordering when possible
if ($ImpactFrame -lt $maxFrame) {
  if ($p8Frame -le $ImpactFrame) { $p8Frame = $ImpactFrame + 1 }
  if ($p9Frame -le $ImpactFrame) { $p9Frame = [int][Math]::Min($maxFrame, ($ImpactFrame + 2)) }
}
if ($p8Frame -gt $maxFrame) { $p8Frame = $maxFrame }
if ($p9Frame -gt $maxFrame) { $p9Frame = $maxFrame }

$framesOut += [pscustomobject]@{ p = 8; label = "P8"; frame = $p8Frame; file = "p8.jpg" }
$framesOut += [pscustomobject]@{ p = 9; label = "P9"; frame = $p9Frame; file = "p9.jpg" }

# Extract JPGs
foreach ($f in ($framesOut | Sort-Object p)) {
  $outFile = Join-Path $OutDir $f.file
  Extract-FrameJpg -Video $VideoPath -FrameNumber $f.frame -OutFile $outFile
  $f | Add-Member -NotePropertyName "path" -NotePropertyValue $outFile -Force
}

# Output JSON
$result = [pscustomobject]@{
  ok          = $true
  signature   = $ScriptSignature
  videoPath   = $VideoPath
  fps         = $fps
  nbFrames    = $nbFrames
  impactFrame = $ImpactFrame
  window      = [pscustomobject]@{
    startFrame = $startFrame
    endFrame   = $endFrame
    preSec     = $PreSeconds
    postSec    = $PostSeconds
  }
  frames      = ($framesOut | Sort-Object p)
}

$result | ConvertTo-Json -Depth 10
