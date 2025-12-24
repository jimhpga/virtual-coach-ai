Set-StrictMode -Version Latest
$ErrorActionPreference = "SilentlyContinue"

Write-Host "`n=== Virtual Coach AI: Clean Dev Start ===`n"

Set-Location "C:\Sites\virtual-coach-ai"

# 1) Kill anything holding port 3000
$portPid = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  Select-Object -First 1 -ExpandProperty OwningProcess)

if ($portPid) {
  Write-Host "Killing PID $portPid on port 3000..."
  Stop-Process -Id $portPid -Force
} else {
  Write-Host "Port 3000 is free."
}

# 2) Clear stale Next dev lock (safe even if missing)
$lockPath = ".\.next\dev\lock"
if (Test-Path $lockPath) {
  Remove-Item $lockPath -Force
  Write-Host "Deleted $lockPath"
} else {
  Write-Host "No lock file found."
}

# 3) Start Next on 3000
$env:PORT = "3000"
Write-Host "`nStarting Next on http://localhost:3000 ..."
Start-Sleep -Milliseconds 200

# Optional: auto-open page after a moment
Start-Process "http://localhost:3000/upload"

npm run dev
