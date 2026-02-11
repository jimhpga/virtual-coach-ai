param([int[]]$Ports = @(3000,3001,3002,3003))

Set-Location C:\Sites\virtual-coach-ai
Write-Host "`n=== KILL PORTS ===" -ForegroundColor Cyan

foreach($p in $Ports){
  $pids = @(Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
  if($pids.Count -eq 0){
    Write-Host "✅ $p: free" -ForegroundColor Green
    continue
  }
  foreach($pid in $pids){
    try{
      $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
      Write-Host ("Killing port {0} PID {1} ({2})" -f $p,$pid,$proc.ProcessName) -ForegroundColor Yellow
      Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    } catch {}
  }
}
