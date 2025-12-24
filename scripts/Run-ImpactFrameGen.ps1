param(
  [string]$VideoPath,
  [double]$ImpactSec = 0,
  [int]$Port = 0
)

Set-Location (Resolve-Path .)

if (-not $VideoPath) {
  $roots = @('.\public\uploads','.\public','.\uploads','.') | Where-Object { Test-Path $_ }
  $latest = $null
  foreach ($r in $roots) {
    $cand = Get-ChildItem $r -Include *.mp4,*.mov,*.mp4,*.mov,*.webm -Recurse -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($cand -and (-not $latest -or $cand.LastWriteTime -gt $latest.LastWriteTime)) { $latest = $cand }
  }
  if (-not $latest) { throw "No .webm found under: $($roots -join ', ')" }
  $VideoPath = $latest.FullName
}

$ffprobe = (Get-Command ffprobe.exe -ErrorAction SilentlyContinue).Path
if (-not $ffprobe) { $ffprobe = (Get-Command ffprobe -ErrorAction SilentlyContinue).Path }
if (-not $ffprobe) { throw "ffprobe not found on PATH" }

$durRaw = & $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VideoPath"
$dur = [double]$durRaw
Write-Host ("Video: {0}" -f $VideoPath)
Write-Host ("Duration: {0:N3}s" -f $dur)

if ($ImpactSec -le 0) { $ImpactSec = [double](Read-Host "Enter ImpactSec (e.g. 8.537)") }

$impact = [Math]::Max(0.05, [Math]::Min($ImpactSec, $dur - 0.12))
Write-Host ("Impact used: {0:N3}" -f $impact)

if ($Port -le 0) {
  foreach ($p in 3001,3002,3003,3004,3005,3006) {
    $hit = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($hit) { $Port = $p; break }
  }
}
if ($Port -le 0) { throw "No Next dev server listening on 3001-3006." }
Write-Host ("Dev server: http://localhost:{0}" -f $Port)

$runId = "IMPACT_" + (Get-Date -Format "yyyyMMdd_HHmmss")
$body = @{
  videoPath = $VideoPath
  impactSec = [Math]::Round($impact, 3)
  runId     = $runId
} | ConvertTo-Json

$resp = Invoke-RestMethod -Method Post -Uri "http://localhost:$Port/api/manual-impact" -ContentType "application/json" -Body $body
$resp | Format-List *

$folder = Join-Path (Resolve-Path .\public\frames) $runId
Write-Host ("Frames folder: {0}" -f $folder)
if (Test-Path $folder) { Invoke-Item $folder } else { Write-Host "Folder not found (API call likely failed)" }

