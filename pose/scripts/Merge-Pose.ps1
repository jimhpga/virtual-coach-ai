param(
  [Parameter(Mandatory=$true)]
  [string]$PoseDir
)

if (!(Test-Path $PoseDir)) {
  throw "PoseDir not found: $PoseDir"
}

$outFile = Join-Path (Split-Path $PoseDir -Parent) "pose_all.json"

$files = Get-ChildItem -Path $PoseDir -Filter "*.json" -File | Sort-Object Name
if ($files.Count -eq 0) {
  throw "No pose json files found in: $PoseDir"
}

Write-Host ("Merging {0} pose json files..." -f $files.Count) -ForegroundColor Cyan

$all = foreach ($f in $files) {
  $raw = Get-Content -Path $f.FullName -Raw
  try {
    $raw | ConvertFrom-Json
  } catch {
    throw ("Bad JSON in file: {0}" -f $f.FullName)
  }
}

$all | ConvertTo-Json -Depth 10 | Set-Content -Path $outFile -Encoding UTF8
Write-Host "✅ Merged pose file: $outFile" -ForegroundColor Green
