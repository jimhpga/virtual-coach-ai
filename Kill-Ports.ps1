$ErrorActionPreference="SilentlyContinue"

# Kill node processes first (fast)
taskkill /IM node.exe /F 2>$null | Out-Null

# Kill anything listening on 3000-3002
$ports = 3000..3002
foreach($p in $ports){
  $pids = netstat -ano | Select-String ":$p\s+.*LISTENING\s+\d+$" | ForEach-Object {
    ($_ -split '\s+')[-1]
  } | Select-Object -Unique
  foreach($pid in $pids){
    if($pid -and $pid -ne "0"){
      taskkill /PID $pid /F 2>$null | Out-Null
    }
  }
}

Write-Host "✅ Killed node + freed ports 3000-3002" -ForegroundColor Green
