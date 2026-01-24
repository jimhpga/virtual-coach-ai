Set-Location $PSScriptRoot

Write-Host "== VCA dev clean ==" -ForegroundColor Cyan

# Stop any running node dev servers
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500

# Remove Next build artifacts (common cause of routes-manifest ENOENT)
Remove-Item .\.next  -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item .\.turbo -Recurse -Force -ErrorAction SilentlyContinue

# Start dev
npm run dev
