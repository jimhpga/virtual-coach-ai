Set-Location C:\Sites\virtual-coach-ai
$ErrorActionPreference="Stop"

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 800

if (Test-Path .\.next) {
  attrib -R -H -S .\.next /S /D 2>$null | Out-Null
  Remove-Item -Recurse -Force .\.next
}

$env:NEXT_DISABLE_TURBOPACK="1"
npm run dev
