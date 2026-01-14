param(
  [Parameter(Mandatory=$true)]
  [string]$VideoPath,

  [int]$FPS = 30
)

if (!(Test-Path $VideoPath)) {
  throw "Video not found: $VideoPath"
}

$root = Split-Path $VideoPath -Parent
$out  = Join-Path $root "frames"

New-Item -ItemType Directory -Force $out | Out-Null

Write-Host "Extracting frames at $FPS fps..." -ForegroundColor Cyan

ffmpeg -y -i "$VideoPath" -vf "fps=$FPS" "$out\frame_%04d.jpg"

Write-Host "✅ Frames written to $out" -ForegroundColor Green
