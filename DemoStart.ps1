param(
  [int]$Port = 3000,
  [string]$BaseUrl = "http://localhost"
)

function Kill-Port([int]$p){
  $lines = netstat -ano | Select-String (":$p\s")
  $pids = @()

  foreach($ln in $lines){
    $m = [regex]::Match($ln.ToString(), "\s+(\d+)$")
    if($m.Success){ $pids += [int]$m.Groups[1].Value }
  }

  $pids = $pids | Sort-Object -Unique
  # Never try to kill PID 0 or our own PowerShell process
  $pids = $pids | Where-Object { $_ -gt 0 -and $_ -ne $PID }

  foreach($procId in $pids){
    try { taskkill /PID $procId /F | Out-Null } catch {}
  }

  if($pids.Count){
    Write-Host ("✅ Killed PIDs on port {0}: {1}" -f $p, ($pids -join ", ")) -ForegroundColor Yellow
  }
}

function CurlHead([string]$url){
  try {
    $h = & curl.exe -sS -I $url
    $m = [regex]::Match($h, 'HTTP/\S+\s+(\d{3})')
    if($m.Success){ return [int]$m.Groups[1].Value }
    return 0
  } catch { return 0 }
}

function Wait-For([string]$url, [int]$secs = 25){
  $t0 = Get-Date
  while(((Get-Date) - $t0).TotalSeconds -lt $secs){
    $code = CurlHead $url
    if($code -ge 200 -and $code -lt 500){ return $true }
    Start-Sleep -Milliseconds 400
  }
  return $false
}

Kill-Port $Port

Write-Host "🚀 Starting dev server..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory (Get-Location) | Out-Null

$base = "$BaseUrl`:$Port"

if(-not (Wait-For "$base/upload" 25)){
  Write-Host ("❌ Dev server didn't come up on {0} (try: npm run dev)" -f $base) -ForegroundColor Red
  exit 1
}

$urls = @(
  "$base/",
  "$base/upload",
  "$base/report-beta?golden=1",
  "$base/health"
)

Write-Host ""
Write-Host "=== VCA DEMO URLS ===" -ForegroundColor Cyan
$urls | ForEach-Object { Write-Host $_ }

Write-Host ""
Write-Host "=== SMOKE CHECK (curl) ===" -ForegroundColor Cyan
foreach($u in $urls){
  $code = CurlHead $u
  if($code -ge 200 -and $code -lt 300){
    Write-Host ("✅ {0}  ({1})" -f $u, $code) -ForegroundColor Green
  } elseif($code -ge 300 -and $code -lt 400){
    Write-Host ("↪️  {0}  ({1})" -f $u, $code) -ForegroundColor Yellow
  } else {
    Write-Host ("❌ {0}  ({1})" -f $u, $code) -ForegroundColor Red
  }
}

Write-Host ""
Write-Host ("Tip: open {0}/upload then click 'Try Golden Demo →'." -f $base) -ForegroundColor Yellow
