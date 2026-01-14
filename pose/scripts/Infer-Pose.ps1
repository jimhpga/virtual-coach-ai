param(
  [Parameter(Mandatory=$true)]
  [string]$FramesDir,

  [ValidateSet("Stub","Real")]
  [string]$Mode = "Stub",

  [int]$FPS = 30
)

if (!(Test-Path $FramesDir)) {
  throw "Frames directory not found: $FramesDir"
}

$out = Join-Path (Split-Path $FramesDir -Parent) "json"
New-Item -ItemType Directory -Force $out | Out-Null

$frames = Get-ChildItem $FramesDir -Filter "*.jpg" | Sort-Object Name
if ($frames.Count -eq 0) { throw "No frames found in: $FramesDir" }

if($Mode -eq "Real"){
  $node = ".\pose\node\movenet_infer.mjs"
  if(!(Test-Path $node)){ throw "Missing node infer script: $node" }

  Write-Host "Running REAL MoveNet inference..." -ForegroundColor Cyan
  node $node --framesDir (Resolve-Path $FramesDir).Path --outDir (Resolve-Path $out).Path --fps $FPS
  Write-Host "✅ Real pose JSON written to $out" -ForegroundColor Green
  return
}

Write-Host "Running STUB pose inference..." -ForegroundColor Yellow

$i = 0
foreach ($f in $frames) {
  $i++
  $pose = @{
    frame = $i
    fps = $FPS
    hips = @{ x = 0.50; y = 0.75 }
    shoulders = @{ x = 0.50; y = 0.55 }
    leadWrist = @{ x = 0.48; y = 0.62 }
  }

  $jsonPath = Join-Path $out ("pose_{0:D4}.json" -f $i)
  $pose | ConvertTo-Json -Depth 6 | Set-Content $jsonPath -Encoding UTF8
}

Write-Host "✅ Stub pose JSON written to $out" -ForegroundColor Green
