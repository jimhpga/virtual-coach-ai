param(
    [int]$IntervalMinutes = 10
)

$root       = "C:\Sites\virtual-coach-ai"
$backupRoot = "E:\VCAI_Backups"
$baseUrl    = "https://virtual-coach-ai-tau.vercel.app"   # change if you switch prod URL

New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

Write-Host "=== Virtual Coach AI Saturday Loop ===" -ForegroundColor Cyan
Write-Host "Root:      $root"
Write-Host "Backups:   $backupRoot"
Write-Host "Base URL:  $baseUrl"
Write-Host "Interval:  $IntervalMinutes minutes"
Write-Host "Press Ctrl+C to stop."
Write-Host ""

while ($true) {
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $folderStamp = Get-Date -Format 'yyyyMMdd-HHmmss'

    Write-Host ""
    Write-Host "========================================" -ForegroundColor DarkCyan
    Write-Host " Cycle started: $stamp"
    Write-Host "========================================" -ForegroundColor DarkCyan

    # 1) Backup
    try {
        $backupDir = Join-Path $backupRoot $folderStamp
        Write-Host "[BACKUP] -> $backupDir"
        # Mirror code, but skip big / useless folders
        robocopy $root $backupDir /MIR /XD .git node_modules .vercel /XF *.zip *.log | Out-Host
    }
    catch {
        Write-Host "[BACKUP] FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }

    # 2) Sanity checks on important files
    Write-Host "[CHECK] Key files" -ForegroundColor Yellow
    $checks = @(
        "index.html",
        "upload.html",
        "reports.html",
        "vercel.json",
        "api\report.js"
    )

    foreach ($c in $checks) {
        $path = Join-Path $root $c
        $ok = Test-Path $path
        $status = if ($ok) { "OK" } else { "MISSING" }
        $color  = if ($ok) { "Green" } else { "Red" }
        Write-Host ("  {0,-20} {1}" -f $c, $status) -ForegroundColor $color
    }

    # 3) Ping live endpoints
    Set-Location $root

    Write-Host "[WEB] Checking live endpoints..." -ForegroundColor Yellow

    try {
        $api = Invoke-WebRequest "$baseUrl/api/report" -UseBasicParsing -TimeoutSec 15
        Write-Host ("  /api/report  -> {0}" -f $api.StatusCode) -ForegroundColor Green
    }
    catch {
        Write-Host ("  /api/report  FAILED -> {0}" -f $_.Exception.Message) -ForegroundColor Red
    }

    try {
        $page = Invoke-WebRequest "$baseUrl/reports" -UseBasicParsing -TimeoutSec 15
        Write-Host ("  /reports      -> {0}" -f $page.StatusCode) -ForegroundColor Green
    }
    catch {
        Write-Host ("  /reports      FAILED -> {0}" -f $_.Exception.Message) -ForegroundColor Red
    }

    # 4) Sleep until next cycle
    Write-Host ""
    Write-Host "Sleeping for $IntervalMinutes minute(s)... (Ctrl+C to stop)"
    Start-Sleep -Seconds ($IntervalMinutes * 60)
}
