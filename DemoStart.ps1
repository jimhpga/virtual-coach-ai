param()

Write-Host "=== VCA DEMO START ===" -ForegroundColor Cyan
taskkill /IM node.exe /F 2>$null | Out-Null

if(Test-Path ".\.next"){
  Remove-Item ".\.next" -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "`nStarting dev server..." -ForegroundColor Green
npm run dev
