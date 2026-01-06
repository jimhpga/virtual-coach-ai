param(
  [Parameter(Mandatory=$true)]
  [string]$Mp4
)

if (!(Test-Path $Mp4)) { throw "File not found: $Mp4" }

$uploadUrl = "http://localhost:3001/api/upload"

# Upload
$uploadJson = curl.exe -sS -X POST $uploadUrl -F ("video=@{0};type=video/mp4" -f $Mp4)
$u = $uploadJson | ConvertFrom-Json
if (-not $u.ok) { throw ("Upload failed: " + $uploadJson) }

# Extract p-frames
$payload = @{ videoUrl = $u.videoUrl; jobId = $u.jobId } | ConvertTo-Json
$tmp = Join-Path $env:TEMP "vcai-payload.json"
$payload | Set-Content -Encoding utf8 $tmp

$extractUrl = "http://localhost:3001/api/extract-pframes"
$extractJson = curl.exe -sS -X POST $extractUrl -H "Content-Type: application/json" --data-binary ("@{0}" -f $tmp)

$e = $extractJson | ConvertFrom-Json
if (-not $e.ok) { throw ("Extract failed: " + $extractJson) }

"OK ✅"
"VideoUrl: " + $u.videoUrl
"FramesDir: " + $e.framesDir
$e.frames.GetEnumerator() | Sort-Object Name | ForEach-Object { "{0} -> {1}" -f $_.Key, $_.Value }
