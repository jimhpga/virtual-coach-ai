Write-Host "`n=== VCA: Start + Smoke ===" -ForegroundColor Cyan

# Kill port 3000 holder (if any)
$portPid = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  Select-Object -First 1 -ExpandProperty OwningProcess)

if ($portPid) {
  Write-Host "Killing PID $portPid on port 3000..." -ForegroundColor Yellow
  Stop-Process -Id $portPid -Force -ErrorAction SilentlyContinue
}

# Remove stale lock
Remove-Item .\.next\dev\lock -Force -ErrorAction SilentlyContinue

# Start Next
$env:PORT="3000"
Start-Process "http://localhost:3000/upload"
npm run dev
