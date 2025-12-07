# vcai-live-test.ps1
# Deploys Virtual Coach AI, calls /api/report, and opens the report page.

Write-Host "=== Virtual Coach AI: Deploying to Vercel (prod) ===`n" -ForegroundColor Cyan

# 1) Deploy to Vercel and capture output
$out = vercel deploy --prod --yes 2>&1

$out | Out-Host

# 2) Extract the production URL from the deploy output
$prodMatch = $out | Select-String -Pattern 'Production:\s+(https://[^\s]+)' -AllMatches | Select-Object -Last 1

if (-not $prodMatch) {
    Write-Host "`n[ERROR] Could not find Production URL in deploy output." -ForegroundColor Red
    exit 1
}

$prod = $prodMatch.Matches[0].Groups[1].Value
Write-Host "`nUsing production URL: $prod`n" -ForegroundColor Green

# 3) Build test body for /api/report
$bodyObject = @{
    name     = "CLI Test Player"
    hand     = "Right"
    eye      = "Right"
    handicap = "8"
    height   = "5-10"
}

$bodyJson = $bodyObject | ConvertTo-Json -Depth 3

Write-Host "=== Calling /api/report with test payload ===`n" -ForegroundColor Cyan
Write-Host $bodyJson
Write-Host ""

try {
    $resp = Invoke-WebRequest `
        -Uri "$prod/api/report" `
        -Method POST `
        -Body $bodyJson `
        -ContentType 'application/json'

} catch {
    Write-Host "`n[ERROR] Request to /api/report failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# 4) Parse JSON and show key fields
$json = $resp.Content | ConvertFrom-Json

Write-Host "`n=== API Response Summary ===" -ForegroundColor Cyan
Write-Host ("Mode:       {0}" -f $json.mode)
Write-Host ("HasKey:     {0}" -f $json.hasKey)
Write-Host ("Error:      {0}" -f $json.error)
Write-Host ("Player:     {0}" -f $json.player)
Write-Host ("ReportPath: {0}" -f $json.reportPath)

# 5) Build report URL and open it
if ($json.reportPath) {
    $reportUrl = "$prod/report.html?report=$($json.reportPath)"
    Write-Host "`nReport URL: $reportUrl" -ForegroundColor Green

    try {
        Start-Process $reportUrl
    } catch {
        Write-Host "[WARN] Could not auto-open browser. Open this URL manually:" -ForegroundColor Yellow
        Write-Host $reportUrl
    }
} else {
    Write-Host "`n[WARN] No reportPath returned from API." -ForegroundColor Yellow
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
