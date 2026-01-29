param(
  [string]$BaseUrl = "http://localhost:3000",
  [int]$Port = 3000,

  # HTML check: any one of these must appear in /report-beta/full
  [string[]]$ReportMustContainAny = @("Tour DNA Match", "Demo report", "Swing Score"),

  # API JSON checks: these must appear in demo response body
  [string[]]$ApiMustContainAll = @('"ok":true', '"headline":"Demo report (safe)"', '"label":"Tour DNA Match"')
)

function Fail($msg){
  Write-Host "FAIL: $msg" -ForegroundColor Red
  exit 1
}

function Ok($msg){
  Write-Host $msg -ForegroundColor Green
}

Write-Host "`n=== VCA SMOKE TEST ===" -ForegroundColor Cyan
Write-Host "BaseUrl: $BaseUrl" -ForegroundColor DarkGray

# 0) Dev server running? (fast fail)
try {
  $conn = Test-NetConnection -ComputerName "127.0.0.1" -Port $Port -WarningAction SilentlyContinue
  if(-not $conn.TcpTestSucceeded){
    Fail "Dev server not reachable on port $Port. Start it: npm run dev (or check it isn't on a different port)."
  }
  Ok "OK  Dev server reachable on port $Port"
} catch {
  # Some environments don't have Test-NetConnection; fallback to curl HEAD.
  $h = (& curl.exe -sS -I "$BaseUrl/" | Select-String "^HTTP/").Line
  if($h -notmatch " 200 "){
    Fail "Dev server check failed. Try: npm run dev"
  }
  Ok "OK  Dev server reachable (fallback HEAD)"
}

# 1) Route integrity
powershell -ExecutionPolicy Bypass -File .\scripts\Check-RouteIntegrity.ps1
if($LASTEXITCODE -ne 0){ Fail "Route integrity check failed" }

# 2) Pages (status 200)
$urls = @(
  "$BaseUrl/",
  "$BaseUrl/upload",
  "$BaseUrl/coming-soon",
  "$BaseUrl/report-beta/full"
)

foreach($u in $urls){
  $h = (& curl.exe -sS -I $u | Select-String "^HTTP/").Line
  if($h -match " 200 "){
    Ok ("OK  " + $u)
  } else {
    Write-Host ("BAD " + $u + " :: " + $h) -ForegroundColor Red
    Fail "Page not OK: $u"
  }
}

# 3) Report render check (HTML contains expected text)
$repUrl = "$BaseUrl/report-beta/full"
$repHtml = & curl.exe -sS $repUrl
if([string]::IsNullOrWhiteSpace($repHtml)){
  Fail "Report page returned empty HTML: $repUrl"
}
$hit = $false
foreach($needle in $ReportMustContainAny){
  if($repHtml -match [regex]::Escape($needle)){
    $hit = $true
    break
  }
}
if(-not $hit){
  Fail ("Report HTML missing expected text. Need ANY of: " + ($ReportMustContainAny -join ", "))
}
Ok "OK  Report HTML contains expected text"

# 4) API (POST demo must be 200 + ok:true + expected payload strings)
$api = "$BaseUrl/api/analyze-swing"
$tmp = Join-Path $env:TEMP "vcai_smoke_body.txt"

$code = & curl.exe -sS -o $tmp -w "%{http_code}" -H "Content-Type: application/json" --data '{"demo":true}' $api
Write-Host ("POST $api => HTTP $code") -ForegroundColor Cyan

$body = Get-Content $tmp -Raw -ErrorAction SilentlyContinue
Remove-Item $tmp -Force -ErrorAction SilentlyContinue

if($code -ne 200){
  Fail ("API POST not 200. Body: " + ($(if($body){ $body.Substring(0,[Math]::Min(500,$body.Length)) } else { "<empty>" })))
}

foreach($must in $ApiMustContainAll){
  if($body -notmatch [regex]::Escape($must)){
    Fail ("API demo response missing required string: $must")
  }
}
Ok "OK  API demo payload looks correct"

Write-Host "`nPASS: Smoke test complete" -ForegroundColor Green
exit 0
