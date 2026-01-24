param(
  [string]$Video = ".\public\demo\swing.mp4",
  [string]$OutDir = ".\public\demo",
  [int]$Frames = 9
)

$ErrorActionPreference = "Stop"

function Assert-File($p){ if(-not (Test-Path $p)){ throw "Missing file: $p" } }
function Ensure-Dir($p){ New-Item -ItemType Directory -Force $p | Out-Null }

Assert-File $Video
Ensure-Dir $OutDir
$framesDir = Join-Path $OutDir "frames"
Ensure-Dir $framesDir

# duration
$dur = & ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "$Video"
if(-not $dur){ throw "ffprobe failed to read duration." }
$dur = [double]$dur

# poster at ~15%
$tPoster = [math]::Max(0.0, [math]::Round($dur * 0.15, 3))
$poster = Join-Path $OutDir "poster.jpg"
& ffmpeg -y -i "$Video" -ss $tPoster -frames:v 1 -q:v 2 -update 1 "$poster" | Out-Null

# p1..p9 evenly spaced 5%..95%
for($i=1; $i -le $Frames; $i++){
  $pct = 0.05 + (0.90 * (($i-1) / [math]::Max(1, ($Frames-1))))
  $t = [math]::Round($dur * $pct, 3)
  $out = Join-Path $framesDir ("p{0}.jpg" -f $i)
  & ffmpeg -y -i "$Video" -ss $t -frames:v 1 -q:v 2 -update 1 "$out" | Out-Null
}

# manifest
$manifest = Join-Path $OutDir "manifest.json"
$obj = [ordered]@{
  version = 1
  video   = @{ url = "/demo/swing.mp4" }
  poster  = @{ url = "/demo/poster.jpg" }
  frames  = @{
    dir   = "/demo/frames"
    files = @(1..$Frames | ForEach-Object { "p$_.jpg" })
  }
}
($obj | ConvertTo-Json -Depth 10) | Set-Content -Encoding UTF8 $manifest

Write-Host "✅ PACKAGED DEMO" -ForegroundColor Green
Write-Host ("   Video:    {0}" -f $Video) -ForegroundColor Cyan
Write-Host ("   Poster:   {0}" -f $poster) -ForegroundColor Cyan
Write-Host ("   Frames:   {0}\p1.jpg ... p{1}.jpg" -f $framesDir, $Frames) -ForegroundColor Cyan
Write-Host ("   Manifest: {0}" -f $manifest) -ForegroundColor Cyan

