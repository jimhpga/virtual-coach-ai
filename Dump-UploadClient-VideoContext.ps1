Set-Location C:\Sites\virtual-coach-ai
$ErrorActionPreference = "Stop"

$fp = ".\public\upload.client.v2.js"
if(!(Test-Path $fp)){ throw "Missing: $fp" }

# Lines you reported:
$linesToShow = @(1,5,85,98,113,114,115,116,118,120,121,123,125,133,134,143,144,145,146) | Sort-Object -Unique

Write-Host "`nFILE:" -ForegroundColor Cyan
Write-Host (Resolve-Path $fp).Path -ForegroundColor Gray

Write-Host "`n=== CONTEXT DUMP (±12 lines around each hit) ===" -ForegroundColor Cyan
foreach($n in $linesToShow){
  $start = [Math]::Max(1, $n-12)
  $end   = $n+12
  Write-Host "`n----- Around line $n (showing $start..$end) -----" -ForegroundColor Yellow
  $i = $start
  Get-Content $fp | Select-Object -Index (($start-1)..($end-1)) | ForEach-Object {
    "{0,5}: {1}" -f $i, $_
    $i++
  }
}
