param(
  [string]$BaseUrl = "https://virtualcoachai.net",
  [string]$WorkRoot = "E:\VCA\_runs\production_worker",
  [double]$PollSec = 15,
  [switch]$Once
)

$ErrorActionPreference = "Stop"

$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Worker = Join-Path $PSScriptRoot "vca_worker_loop.py"
$KeyFile = "E:\VCA\secrets\vca_worker.key"

if(-not (Test-Path -LiteralPath $Worker)){
  throw "Worker script not found: $Worker"
}
if(-not (Test-Path -LiteralPath $KeyFile)){
  throw "Worker identity file not found: $KeyFile"
}

$Python = (Get-Command python -ErrorAction Stop).Source

$Args = @(
  $Worker,
  "--baseUrl", $BaseUrl,
  "--repo", $Repo,
  "--workRoot", $WorkRoot,
  "--workerKeyFile", $KeyFile,
  "--pollSec", [string]$PollSec
)

if($Once){
  $Args += "--once"
}

Write-Host "VCA analysis worker" -ForegroundColor Cyan
Write-Host ("  Base URL : " + $BaseUrl)
Write-Host ("  Repo     : " + $Repo)
Write-Host ("  Work root: " + $WorkRoot)
Write-Host ("  Mode     : " + $(if($Once){"one job"}else{"continuous"}))

& $Python @Args
exit $LASTEXITCODE
