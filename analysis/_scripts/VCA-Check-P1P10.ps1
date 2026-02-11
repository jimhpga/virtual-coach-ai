param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [switch]$Demo
)

$demoFlag = if($Demo){ "true" } else { "false" }

$raw = curl.exe -sS -X POST "$BaseUrl/api/analyze-swing" `
  -H "Content-Type: application/json" `
  --data "{""demo"":$demoFlag}" 2>&1 | Out-String

if([string]::IsNullOrWhiteSpace($raw)){
  Write-Host "❌ FAIL: Empty response (curl returned no stdout)" -ForegroundColor Red
  exit 1
}

if($raw.TrimStart().StartsWith("<")){
  Write-Host "❌ FAIL: Returned HTML (server error page)" -ForegroundColor Red
  Write-Host ($raw.Substring(0,[Math]::Min(400,$raw.Length)))
  exit 1
}

try {
  $j = $raw | ConvertFrom-Json
} catch {
  Write-Host "❌ FAIL: Response is not valid JSON" -ForegroundColor Red
  Write-Host ($raw.Substring(0,[Math]::Min(400,$raw.Length)))
  exit 1
}

if(-not ($j.PSObject.Properties.Name -contains "p_checkpoints")){
  Write-Host "❌ FAIL: Missing p_checkpoints" -ForegroundColor Red
  Write-Host ("TOP_KEYS=" + (($j.PSObject.Properties.Name) -join ", "))
  exit 1
}

$ps = @($j.p_checkpoints | Select-Object -ExpandProperty p | Sort-Object)
$ok = ($ps.Count -eq 10) -and ($ps[0] -eq 1) -and ($ps[9] -eq 10)

if($ok){
  Write-Host "✅ OK: P1..P10 present" -ForegroundColor Green
  Write-Host ("p-list=" + ($ps -join ","))
  $j.p_checkpoints | Select-Object p,label,desc | Sort-Object p | Format-Table -Auto
  exit 0
} else {
  Write-Host ("❌ FAIL: Expected 1..10, got: " + ($ps -join ",")) -ForegroundColor Red
  $j.p_checkpoints | Select-Object p,label,desc | Sort-Object p | Format-Table -Auto
  exit 1
}