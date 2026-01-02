$ErrorActionPreference = "Stop"

$vc = Join-Path $env:APPDATA "npm\node_modules\vercel\dist\vc.js"
if (-not (Test-Path $vc)) { throw "Missing vc.js: $vc" }

function Invoke-VercelText([string[]]$Args) {
  $tmp = Join-Path $env:TEMP ("vercel_out_{0}.txt" -f ([guid]::NewGuid().ToString("N")))
  try {
    cmd /c "node ""$vc"" $($Args -join ' ') > ""$tmp"" 2>&1" | Out-Null
    $txt = Get-Content -Raw $tmp
    # strip banner lines
    ($txt -split "`r?`n" | Where-Object { $_ -notmatch '^\s*Vercel CLI\s+\d+\.\d+\.\d+' }) -join "`r`n"
  } finally {
    Remove-Item -Force $tmp -ErrorAction SilentlyContinue
  }
}

Write-Host "=== Deploying PREVIEW ===" -ForegroundColor Cyan
$out = Invoke-VercelText @()   # running `vercel` with no args => preview deploy

# Extract Preview URL (most reliable for your output)
$preview = ($out -split "`r?`n" | Where-Object { $_ -match '^\s*Preview:\s*(https://[^\s]+\.vercel\.app)\s*$' } |
  ForEach-Object { [regex]::Match($_,'https://[^\s]+\.vercel\.app').Value } | Select-Object -First 1)

if (-not $preview) {
  # fallback: any .vercel.app URL in output
  $preview = ([regex]::Match($out, 'https://[^\s]+\.vercel\.app')).Value
}

if (-not $preview) {
  throw ("Could not find Preview URL in output.`n--- RAW ---`n{0}" -f $out)
}

Write-Host ("Using URL: {0}" -f $preview) -ForegroundColor Green

# --- API test (POST) ---
$body = @{ uploadId="demo-123"; activePhase="P5" } | ConvertTo-Json
$r = Invoke-WebRequest -Method Post -Uri "$preview/api/pose-estimate" -ContentType "application/json" -Body $body -UseBasicParsing

"STATUS: $($r.StatusCode)"
"CONTENT-TYPE: $($r.Headers['Content-Type'])"
"X-MATCHED-PATH: $($r.Headers['x-matched-path'])"
"FIRST-120:`n$($r.Content.Substring(0,[Math]::Min(120, $r.Content.Length)))"

# --- static asset test ---
$img = Invoke-WebRequest -Uri "$preview/pose-demo.jpg" -UseBasicParsing
"POSE-DEMO STATUS: $($img.StatusCode)"
