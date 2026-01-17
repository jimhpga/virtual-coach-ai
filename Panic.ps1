$ErrorActionPreference="SilentlyContinue"

Write-Host "=== PANIC BUTTON: restore -> kill ports -> reset dev -> health ===" -ForegroundColor Cyan

if(Test-Path .\Restore-KnownGood.ps1){
  try { .\Restore-KnownGood.ps1 } catch { Write-Host "Restore-KnownGood failed: $_" -ForegroundColor Yellow }
} else {
  Write-Host "Restore-KnownGood.ps1 not found (skipping restore)" -ForegroundColor Yellow
}

if(Test-Path .\Kill-Ports.ps1){
  .\Kill-Ports.ps1
} else {
  Write-Host "Kill-Ports.ps1 not found (skipping kill)" -ForegroundColor Yellow
}

if(Test-Path .\Reset-Dev.ps1){
  .\Reset-Dev.ps1
} else {
  Write-Host "Reset-Dev.ps1 not found (skipping reset)" -ForegroundColor Yellow
}

if(Test-Path .\Health.ps1){
  .\Health.ps1
} else {
  Write-Host "Health.ps1 not found (skipping health)" -ForegroundColor Yellow
}

Write-Host "=== DONE ===" -ForegroundColor Green
