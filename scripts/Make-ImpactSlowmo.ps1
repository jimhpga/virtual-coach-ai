param(
  [Parameter(Mandatory=$true)][string]$VideoPath,
  [Parameter(Mandatory=$true)][double]$ImpactSec
)

# find a running Next dev port
$port = $null
foreach ($p in 3001,3002,3003,3004,3005,3006) {
  $hit = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($hit) { $port = $p; break }
}
if (-not $port) { throw "No Next dev server listening on 3001-3006. Start npm run dev first." }

$runId = "IMPACT_" + (Get-Date -Format "yyyyMMdd_HHmmss")
$body = @{
  videoPath = $VideoPath
  impactSec = [Math]::Round($ImpactSec, 3)
  runId     = $runId
} | ConvertTo-Json

$resp = Invoke-RestMethod -Method Post -Uri "http://localhost:$port/api/impact-clip" -ContentType "application/json" -Body $body
$resp | Format-List *

$out = Join-Path (Resolve-Path .\public\frames) $runId
"Frames folder: $out"
if (Test-Path $out) { ii $out } else { "❌ Output folder not found" }
