param(
  [int]$Port = 3000
)

Write-Host "=== VCA DEV START ===" -ForegroundColor Cyan

# Kill any node holding the port (safe)
try {
  $p = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
       Select-Object -First 1
  if ($p) {
    $procId = $p.OwningProcess
    Write-Host "Killing process on port $Port (PID $procId)..." -ForegroundColor Yellow
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  }
} catch {}

# Also kill any orphan node (optional, but keeps life simple)
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Clean dev cache
Remove-Item -Recurse -Force .\.next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\.vercel -ErrorAction SilentlyContinue

# Ensure deps
if (!(Test-Path .\node_modules)) {
  Write-Host "node_modules missing -> npm install" -ForegroundColor Yellow
  npm install
}

# Start dev
Write-Host "Starting Next dev on port $Port..." -ForegroundColor Green
Start-Sleep -Milliseconds 300

# Open browser after a moment
Start-Job -ScriptBlock {
  Start-Sleep -Seconds 2
  Start-Process "http://localhost:3000"
} | Out-Null

$env:PORT = "$Port"
npx next dev -p $Port
