param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [int]$TimeoutSec = 2
)

$ErrorActionPreference = "SilentlyContinue"

function Say($msg,$color="Gray"){ Write-Host $msg -ForegroundColor $color }

function HttpCode($method,$url,$bodyJson){
  try{
    if($method -eq "GET"){
      $r = Invoke-WebRequest -UseBasicParsing -Uri $url -Method Get -TimeoutSec $TimeoutSec
      return [int]$r.StatusCode
    } else {
      $r = Invoke-WebRequest -UseBasicParsing -Uri $url -Method Post -TimeoutSec $TimeoutSec -ContentType "application/json" -Body $bodyJson
      return [int]$r.StatusCode
    }
  } catch {
    # Try to extract status code if available
    try { return [int]$_.Exception.Response.StatusCode.value__ } catch { return 0 }
  }
}

function GetJson($method,$url,$bodyJson){
  try{
    if($method -eq "GET"){
      return (Invoke-RestMethod -Uri $url -Method Get -TimeoutSec $TimeoutSec)
    } else {
      return (Invoke-RestMethod -Uri $url -Method Post -TimeoutSec $TimeoutSec -ContentType "application/json" -Body $bodyJson)
    }
  } catch {
    return $null
  }
}

$api = "$BaseUrl/api/analyze-swing"

Say "`n=== VCA HEALTH CHECK ===" Cyan
Say ("BaseUrl: " + $BaseUrl) DarkGray
Say ("API:     " + $api) DarkGray

# 1) GET should be 200
$codeGet = HttpCode "GET" $api $null
if($codeGet -eq 200){ Say "✅ GET /api/analyze-swing => 200" Green } else { Say "❌ GET /api/analyze-swing => $codeGet" Red }

# 2) POST demo should be 200 and return ok:true
$codePost = HttpCode "POST" $api '{"demo":true}'
if($codePost -eq 200){ Say "✅ POST demo => 200" Green } else { Say "❌ POST demo => $codePost" Red }

$j = GetJson "POST" $api '{"demo":true}'
if($null -eq $j){
  Say "❌ POST demo did not return JSON." Red
  exit 1
}

if($j.ok -eq $true){ Say "✅ demo JSON ok=true" Green } else { Say "❌ demo JSON ok != true" Red }
if($j.jobId){ Say ("✅ jobId=" + $j.jobId) Green } else { Say "⚠️ jobId missing" Yellow }
if($j.debug.__diag){ Say ("✅ __diag=" + $j.debug.__diag) Green } else { Say "⚠️ __diag missing" Yellow }

# 3) Quick homepage check (helps catch server not actually up)
$home = "$BaseUrl/"
$codeHome = HttpCode "GET" $home $null
if($codeHome -eq 200){ Say "✅ GET / => 200" Green } else { Say "⚠️ GET / => $codeHome" Yellow }

Say "=== DONE ===`n" Cyan
