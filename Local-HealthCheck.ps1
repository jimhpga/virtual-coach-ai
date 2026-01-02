$ErrorActionPreference = "Stop"

$port = $env:PORT
if (-not $port) { $port = "3005" }
$base = "http://localhost:$port"

$body = @{ uploadId="demo-123"; activePhase="P5" } | ConvertTo-Json

try {
  $r = Invoke-WebRequest -Method Post -Uri "$base/api/pose-estimate" -ContentType "application/json" -Body $body -UseBasicParsing
  "STATUS: $($r.StatusCode)"
  "CONTENT-TYPE: $($r.Headers['Content-Type'])"
  "MODE: $($r.Headers['x-vca-pose-mode'])"
  "X-MATCHED-PATH: $($r.Headers['x-matched-path'])"
  "FIRST-200:`n$($r.Content.Substring(0,[Math]::Min(200,$r.Content.Length)))"
} catch {
  $resp = $_.Exception.Response
  if ($resp) {
    "HTTP: $([int]$resp.StatusCode) $($resp.StatusDescription)"
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $txt = $sr.ReadToEnd()
    "BODY-FIRST-600:`n$($txt.Substring(0,[Math]::Min(600,$txt.Length)))"
  } else {
    "❌ Request failed: $($_.Exception.Message)"
  }
}
