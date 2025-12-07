param(
  # Change this to whichever prod URL you want as “home base”
  [string]$ProdBase = "https://virtual-coach-ai-tau.vercel.app"
)

Write-Host ""
Write-Host "=== Virtual Coach AI Warm-Up — Live AI Reports ===" -ForegroundColor Cyan
Write-Host "Using base URL: $ProdBase"
Write-Host ""

# A few sample “players” to exercise the pipeline
$players = @(
  @{ name = "Warmup Player 1"; hand = "Right"; eye = "Right"; handicap = "5";  height = "5-10" },
  @{ name = "Warmup Player 2"; hand = "Right"; eye = "Left";  handicap = "10"; height = "6-0"  },
  @{ name = "Warmup Player 3"; hand = "Left";  eye = "Right"; handicap = "15"; height = "5-8"  }
)

$reportUrls = @()

foreach ($p in $players) {
  Write-Host ">>> Generating report for $($p.name) ..." -ForegroundColor Cyan

  $body = @{
    name     = $p.name
    hand     = $p.hand
    eye      = $p.eye
    handicap = $p.handicap
    height   = $p.height
  } | ConvertTo-Json

  try {
    $res = Invoke-WebRequest `
      -Uri "$ProdBase/api/report" `
      -Method POST `
      -Body $body `
      -ContentType 'application/json'

    $json = $res.Content | ConvertFrom-Json

    $mode   = $json.mode
    $player = $json.player
    $err    = $json.error

    Write-Host "  Mode:   $mode"   -ForegroundColor DarkGray
    if ($err) {
      Write-Host "  Error:  $err" -ForegroundColor Red
    }

    # Prefer S3-style URL, fall back to reportPath, then demo
    $reportUrl  = $json.reportUrl
    $reportPath = $json.reportPath

    if ($reportUrl) {
      $viewer = "$ProdBase/report.html?report=$([uri]::EscapeDataString($reportUrl))&player=$([uri]::EscapeDataString($player))"
    } elseif ($reportPath) {
      $viewer = "$ProdBase/report.html?report=$([uri]::EscapeDataString($reportPath))&player=$([uri]::EscapeDataString($player))"
    } else {
      $viewer = "$ProdBase/report.html?report=reports/demo/report.json&player=$([uri]::EscapeDataString($player))"
    }

    Write-Host "  Viewer: $viewer" -ForegroundColor Green
    $reportUrls += $viewer
  }
  catch {
    Write-Host "  FAILED for $($p.name): $($_.Exception.Message)" -ForegroundColor Red
  }

  Write-Host ""
}

Write-Host "=== Warm-up complete. Viewer URLs ===" -ForegroundColor Yellow
$reportUrls | ForEach-Object { Write-Host "  $_" }
Write-Host ""
