Set-Location C:\Sites\virtual-coach-ai

Write-Host "Stopping node..." -ForegroundColor Cyan
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Removing .next/.turbo/out/cache..." -ForegroundColor Cyan
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .\.next
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .\.turbo
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .\out
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .\node_modules\.cache

Write-Host "Removing node_modules..." -ForegroundColor Cyan
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .\node_modules

Write-Host "npm install..." -ForegroundColor Cyan
npm install

Write-Host "Starting dev server..." -ForegroundColor Green
npm run dev
