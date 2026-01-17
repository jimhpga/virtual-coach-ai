$ErrorActionPreference="Stop"
$client=".\app\report-beta\ReportBetaClient.tsx"
$post=".\app\lib\postAssess.ts"

function Restore-Latest($pattern,$dest){
  $latest = Get-ChildItem -Path (Split-Path $dest) -Filter $pattern -File |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if(-not $latest){ throw "No snapshot found for $pattern in $(Split-Path $dest)" }
  Copy-Item $latest.FullName $dest -Force
  Write-Host ("✅ Restored: {0} <- {1}" -f $dest,$latest.Name) -ForegroundColor Green
}

Restore-Latest "ReportBetaClient.tsx.KNOWN_GOOD_*" $client
Restore-Latest "postAssess.ts.KNOWN_GOOD_*" $post

Write-Host "✅ Done. Now run: .\Reset-Dev.ps1" -ForegroundColor Cyan
