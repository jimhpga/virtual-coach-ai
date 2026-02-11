param(
  [int]$Port = 3000
)

Set-Location C:\Sites\virtual-coach-ai

Write-Host "`n=== VCA RUN DEMO (CLEAN BOOT) ===" -ForegroundColor Cyan

# Kill anything on the target port
Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

# Clear caches (fast)
Remove-Item .\.next -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item .\node_modules\.cache -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Starting dev server on PORT=$Port ..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", ("cd /d C:\Sites\virtual-coach-ai && set PORT=" + $Port + " && npm run dev") -WindowStyle Normal

# Wait up to 25 seconds for port to listen
$up = $false
for($i=1; $i -le 50; $i++){
  $c = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  if($c){ $up = $true; break }
  Start-Sleep -Milliseconds 500
}

if(-not $up){
  Write-Host "❌ Dev server did not bind to port $Port." -ForegroundColor Red
  Write-Host "Tip: check for build errors in the dev window, or run: npm run dev" -ForegroundColor Yellow
  exit 1
}

Write-Host "✅ Port $Port is listening." -ForegroundColor Green
Write-Host "Running health check..." -ForegroundColor Cyan

powershell -ExecutionPolicy Bypass -File .\scripts\VCA-Health.ps1 -BaseUrl ("http://127.0.0.1:" + $Port)

Write-Host "`nOpen:" -ForegroundColor Cyan
Write-Host ("  http://127.0.0.1:" + $Port + "/") -ForegroundColor Green
Write-Host ("  http://127.0.0.1:" + $Port + "/api/analyze-swing") -ForegroundColor Green
