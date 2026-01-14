param(
  [int]$Port = 3000,
  [string]$VideoUrl = "",
  [int]$ImpactFrame = 62
)

function Hit($method, $url, $bodyObj=$null, $timeout=30){
  $sw = [Diagnostics.Stopwatch]::StartNew()
  try{
    $params = @{
      Uri = $url
      Method = $method
      TimeoutSec = $timeout
      UseBasicParsing = $true
    }
    if($bodyObj -ne $null){
      $params.ContentType = "application/json"
      $params.Body = ($bodyObj | ConvertTo-Json -Depth 12)
    }
    $r = Invoke-WebRequest @params
    $sw.Stop()
    [pscustomobject]@{
      ok = $true
      ms = $sw.ElapsedMilliseconds
      status = $r.StatusCode
      len = $r.Content.Length
      head = $r.Content.Substring(0, [Math]::Min(300, $r.Content.Length))
    }
  } catch {
    $sw.Stop()
    [pscustomobject]@{
      ok = $false
      ms = $sw.ElapsedMilliseconds
      error = $_.Exception.Message
    }
  }
}

$base = "http://localhost:$Port"

Write-Host "`n=== PORT CHECK ===" -ForegroundColor Cyan
$tnc = Test-NetConnection 127.0.0.1 -Port $Port -WarningAction SilentlyContinue
if(-not $tnc.TcpTestSucceeded){
  Write-Host "❌ Port $Port is not listening." -ForegroundColor Red
  exit 1
}
Write-Host "✅ Port $Port is listening." -ForegroundColor Green

Write-Host "`n=== HEALTH ===" -ForegroundColor Cyan
$h = Hit GET "$base/api/health" $null 10
$h | Format-List

Write-Host "`n=== EXTRACT PFRAMES ===" -ForegroundColor Cyan
if([string]::IsNullOrWhiteSpace($VideoUrl)){
  Write-Host "⚠️  No -VideoUrl provided. Skipping extract-pframes call." -ForegroundColor Yellow
} else {
  $b = @{ videoUrl = $VideoUrl; impactFrame = $ImpactFrame }
  $e = Hit POST "$base/api/extract-pframes" $b 40
  $e | Format-List
}

Write-Host "`n=== FULL REPORT (optional) ===" -ForegroundColor Cyan
# If your report route exists, test it by uncommenting and setting the route below.
# $route = "$base/api/full-swing-report"
# $payload = @{ description = "Test swing. Level: beginner." }
# $rpt = Hit POST $route $payload 40
# $rpt | Format-List

Write-Host "`nDone." -ForegroundColor Green
