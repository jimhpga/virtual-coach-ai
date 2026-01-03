param(
  [int]$Port = 3000
)

Write-Host "=== Checking localhost:$Port ===" -ForegroundColor Cyan

$listen = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listen) {
  $procId = ($listen | Select-Object -First 1).OwningProcess
  Write-Host "✅ LISTENING on $Port (Process $procId)" -ForegroundColor Green
} else {
  Write-Host "❌ NOT LISTENING on $Port" -ForegroundColor Red
  exit 1
}

try {
  $r = Invoke-WebRequest -Uri ("http://localhost:{0}/" -f $Port) -UseBasicParsing -TimeoutSec 5
  Write-Host ("✅ HTTP {0} {1}" -f $r.StatusCode, $r.StatusDescription) -ForegroundColor Green
} catch {
  Write-Host "❌ HTTP request failed:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Yellow
  exit 2
}

Write-Host "Open: http://localhost:$Port" -ForegroundColor Cyan
