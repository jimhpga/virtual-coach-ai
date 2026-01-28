Write-Host "▶️ Testing /api/analyze-swing (demo + normal)" -ForegroundColor Cyan

$demo = cmd.exe /c 'curl.exe -sS -X POST "http://127.0.0.1:3000/api/analyze-swing" -H "Content-Type: application/json" --data "{""demo"":true}"' 2>&1
$demoTxt = ($demo | Out-String).Trim()
if(-not ($demoTxt.StartsWith("{") -or $demoTxt.StartsWith("["))){
  Write-Host "❌ DEMO returned non-JSON (first 200 chars):" -ForegroundColor Red
  Write-Host ($demoTxt.Substring(0,[Math]::Min(200,$demoTxt.Length)))
  exit 1
}
$j1 = $demoTxt | ConvertFrom-Json

$norm = cmd.exe /c 'curl.exe -sS -X POST "http://127.0.0.1:3000/api/analyze-swing" -H "Content-Type: application/json" --data "{}"' 2>&1
$normTxt = ($norm | Out-String).Trim()
if(-not ($normTxt.StartsWith("{") -or $normTxt.StartsWith("["))){
  Write-Host "❌ NORMAL returned non-JSON (first 200 chars):" -ForegroundColor Red
  Write-Host ($normTxt.Substring(0,[Math]::Min(200,$normTxt.Length)))
  exit 1
}
$j2 = $normTxt | ConvertFrom-Json

# Hard checks
if (-not $j1.ok) { Write-Host "❌ DEMO ok=false" -ForegroundColor Red; exit 1 }
if ($j1.debug.latestPoseSource -ne "latest") {
  Write-Host ("❌ DEMO source={0} (expected latest)" -f $j1.debug.latestPoseSource) -ForegroundColor Red
  exit 1
}

if (-not $j2.ok) { Write-Host "❌ NORMAL ok=false" -ForegroundColor Red; exit 1 }
if ($j2.debug.latestPoseSource -ne "mini") {
  Write-Host ("❌ NORMAL source={0} (expected mini)" -f $j2.debug.latestPoseSource) -ForegroundColor Red
  exit 1
}

# Print
Write-Host ("✅ PASS: demo=latest ({0} frames), normal=mini ({1} frames)" -f $j1.debug.latestPoseFrames, $j2.debug.latestPoseFrames) -ForegroundColor Green
