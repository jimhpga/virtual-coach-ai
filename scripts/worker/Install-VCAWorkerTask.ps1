param(
  [string]$TaskName = "VCA Analysis Worker",
  [string]$BaseUrl = "https://virtualcoachai.net",
  [switch]$StartNow
)

$ErrorActionPreference = "Stop"

$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$StartScript = Join-Path $PSScriptRoot "Start-VCAWorker.ps1"
$KeyFile = "E:\VCA\secrets\vca_worker.key"
$LogDir = "E:\VCA\logs"
$LogFile = Join-Path $LogDir "analysis-worker.log"

if(-not (Test-Path -LiteralPath $StartScript)){ throw "Worker launcher not found: $StartScript" }
if(-not (Test-Path -LiteralPath $KeyFile)){ throw "Worker identity file is missing." }
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$arguments = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $StartScript + '" -BaseUrl "' + $BaseUrl + '" -LogFile "' + $LogFile + '"'
$mode = "ScheduledTask"

try {
  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments -WorkingDirectory $Repo
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 99 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
  $userId = "$env:USERDOMAIN\$env:USERNAME"
  $principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Virtual Coach AI local biomechanics analysis worker" -Force -ErrorAction Stop | Out-Null
} catch {
  $mode = "StartupFolder"
  $startup = [Environment]::GetFolderPath('Startup')
  if(-not $startup){ throw "Could not resolve Windows Startup folder." }
  $cmdPath = Join-Path $startup "VCA-Analysis-Worker.cmd"
  $cmd = '@echo off' + [Environment]::NewLine + 'start "" /min powershell.exe ' + $arguments
  [IO.File]::WriteAllText($cmdPath, $cmd, [Text.Encoding]::ASCII)
}

Write-Host ("Installed worker persistence: " + $mode) -ForegroundColor Green
Write-Host ("Log: " + $LogFile)

if($StartNow){
  $existing = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match 'vca_worker_loop\.py' } | Select-Object -First 1
  if($existing){
    Write-Host ("Worker already running. PID: " + $existing.ProcessId) -ForegroundColor Cyan
  } else {
    if($mode -eq "ScheduledTask"){
      Start-ScheduledTask -TaskName $TaskName
    } else {
      Start-Process -FilePath "powershell.exe" -ArgumentList $arguments -WindowStyle Hidden
    }
    Start-Sleep -Milliseconds 900
    $running = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match 'vca_worker_loop\.py' } | Select-Object -First 1
    if($running){
      Write-Host ("Worker started. PID: " + $running.ProcessId) -ForegroundColor Cyan
    } else {
      Write-Host "Worker launch requested; check the log if it exits immediately." -ForegroundColor Yellow
    }
  }
}
