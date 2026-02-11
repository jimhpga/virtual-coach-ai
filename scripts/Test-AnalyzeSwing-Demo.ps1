param(
  [string]$BaseUrl = "http://127.0.0.1:3000"
)

$ErrorActionPreference = "Stop"

# Always use file-based body to avoid PowerShell escaping issues
$tmp = Join-Path $PSScriptRoot "..\_demo_body.json"
'{"demo":true}' | Set-Content -Path $tmp -Encoding ASCII

$raw = curl.exe -s "$BaseUrl/api/analyze-swing" `
  -H "Content-Type: application/json" `
  --data-binary "@$tmp"

# Show quick proof
$j = $raw | ConvertFrom-Json
Write-Host ("ok={0} swingScore={1} faults={2}" -f $j.ok, $j.swingScore, $j.rankedFaults.Count) -ForegroundColor Green
Write-Host ("meaning0: {0}" -f $j.rankedFaults[0].meaning) -ForegroundColor Cyan

# Save response for inspection
$out = Join-Path $PSScriptRoot "..\analysis\_out\analyze_demo_latest.json"
New-Item -ItemType Directory -Force -Path (Split-Path $out -Parent) | Out-Null
[System.IO.File]::WriteAllText($out, $raw, [System.Text.Encoding]::UTF8)
Write-Host ("saved: {0}" -f $out) -ForegroundColor DarkGray
