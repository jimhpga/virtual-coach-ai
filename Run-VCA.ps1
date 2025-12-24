Write-Host "`n=== VCA: Start + Smoke ===" -ForegroundColor Cyan

# Kill port 3000 holder (if any)
$p = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)
if ($p) {
  Write-Host "Killing PID $p on port 3000..." -ForegroundColor Yellow
  Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
}

# Remove stale lock
Remove-Item .\.next\dev\lock -Force -ErrorAction SilentlyContinue

# Start
$env:PORT="3000"
Start-Process "http://localhost:3000/upload"
npm run dev
