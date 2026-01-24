# Smoke-VCA.ps1 (VCA)
$ErrorActionPreference = "Stop"

$base = "http://localhost:3000"
$routes = @("/", "/upload", "/report-beta")

Write-Host "==> Stop node" -ForegroundColor Cyan
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "==> Start dev server" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd C:\Sites\virtual-coach-ai; npm run dev"
) | Out-Null

Write-Host "==> Waiting for server..." -ForegroundColor Yellow
$ok = $false
for($i=0; $i -lt 60; $i++){
  try{
    $h = (curl.exe -sS -D - -o NUL "$base/" 2>$null | Out-String)
    if($h -match "HTTP/1\.1 200"){
      $ok = $true
      break
    }
  } catch {}
  Start-Sleep -Milliseconds 500
}
if(-not $ok){ throw "❌ Server never returned 200 on /" }

function Test-Route($url){
  $hdr = (curl.exe -sS -D - -o NUL $url | Out-String)
  $code = ($hdr | Select-String "HTTP/1\.1" | Select-Object -First 1).ToString()
  $loc  = ($hdr | Select-String "^location:" | Select-Object -First 1)
  [pscustomobject]@{
    Url = $url
    Status = $code.Trim()
    Location = if($loc){ $loc.ToString().Trim() } else { "" }
  }
}

Write-Host "`n==> Route checks" -ForegroundColor Green
$results = foreach($r in $routes){ Test-Route "$base$r" }
$results | Format-Table -AutoSize

if(($results | Where-Object { $_.Status -notmatch "200 OK" }).Count -gt 0){
  throw "❌ One or more routes not 200. Fix before demo."
}

Write-Host "`n✅ Smoke test passed. Your demo won't embarrass you." -ForegroundColor Green
