# Don't let Vercel's noisy stderr kill the script
$ErrorActionPreference = "Continue"

Write-Host "`nRunning local production build (npm run build)..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build FAILED locally. Stopping before deploy – scroll up for the real error." -ForegroundColor Red
    exit 1
}

Write-Host "`nLocal build OK – deploying to Vercel production..." -ForegroundColor Cyan

# Use cmd to bypass the PowerShell vercel.ps1 shim drama
$deployOut = cmd /c "vercel deploy --prod --yes 2>&1"
$deployOut | Out-Host

# Try to extract the Production URL
$prodLine = $deployOut | Select-String -Pattern 'Production:\s+(https://[^\s]+)' | Select-Object -First 1

if ($prodLine -and $prodLine.Matches.Count -gt 0) {
    $url = $prodLine.Matches[0].Groups[1].Value
    Write-Host "`n✓ Production URL: $url" -ForegroundColor Green
} else {
    Write-Host "`n(!) Could not detect production URL from output, but deploy command finished." -ForegroundColor Yellow
}
