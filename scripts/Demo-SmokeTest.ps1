param(
  [string]$Base = "http://localhost:3000",
  [double]$ImpactSec = 2.5
)

function Read-ErrBody($e){
  $resp = $e.Exception.Response
  if($resp){
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $txt = $sr.ReadToEnd()
    $sr.Close()
    return $txt
  }
  return ($e | Out-String)
}

Write-Host "=== VCA DEMO SMOKE TEST ===" -ForegroundColor Cyan

# 1) Ensure HERO exists
$hero = Join-Path (Get-Location) "public\uploads\HERO_SWING.mkv"
if(!(Test-Path $hero)){
  Write-Host "❌ HERO missing: $hero" -ForegroundColor Red
  Write-Host "Fix: Copy any swing_*.mkv to HERO_SWING.mkv" -ForegroundColor Yellow
  exit 1
}
Write-Host "✅ HERO exists: $hero" -ForegroundColor Green

$body = @{ videoUrl="/uploads/HERO_SWING.mkv"; impactSec=$ImpactSec } | ConvertTo-Json -Compress

# 2) extract-pframes twice (cache check)
try {
  $e1 = Invoke-RestMethod -Method Post -Uri "$Base/api/extract-pframes" -ContentType "application/json" -Body $body
  $e2 = Invoke-RestMethod -Method Post -Uri "$Base/api/extract-pframes" -ContentType "application/json" -Body $body
  Write-Host "✅ extract-pframes ok" -ForegroundColor Green
  Write-Host ("framesDir: " + $e2.framesDir) -ForegroundColor Gray
  if($e2.meta -and $e2.meta.cached -eq $true){
    Write-Host "✅ cached=True" -ForegroundColor Green
  } else {
    Write-Host "⚠️ cached not true (still works, but slower)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "❌ extract-pframes failed" -ForegroundColor Red
  Write-Host (Read-ErrBody $_) -ForegroundColor Red
  exit 1
}

# 3) analyze
try {
  $a = Invoke-RestMethod -Method Post -Uri "$Base/api/analyze" -ContentType "application/json" -Body $body
  if(-not $a.ok){ throw "analyze returned ok=false" }
  Write-Host "✅ analyze ok" -ForegroundColor Green
  Write-Host ("jobId: " + $a.jobId) -ForegroundColor Gray
  Write-Host ("framesDir: " + $a.framesDir) -ForegroundColor Gray
} catch {
  Write-Host "❌ analyze failed" -ForegroundColor Red
  Write-Host (Read-ErrBody $_) -ForegroundColor Red
  exit 1
}

# 4) fetch p1.jpg
try {
  $imgUrl = "$Base$($a.framesDir)/p1.jpg"
  $r = Invoke-WebRequest -UseBasicParsing -Uri $imgUrl
  if($r.StatusCode -ne 200){ throw "p1.jpg returned $($r.StatusCode)" }
  Write-Host "✅ p1.jpg 200 OK" -ForegroundColor Green
  Write-Host $imgUrl -ForegroundColor DarkGray
} catch {
  Write-Host "❌ p1.jpg fetch failed" -ForegroundColor Red
  Write-Host (Read-ErrBody $_) -ForegroundColor Red
  exit 1
}

Write-Host "=== PASS: DEMO IS LOCKED ===" -ForegroundColor Cyan
