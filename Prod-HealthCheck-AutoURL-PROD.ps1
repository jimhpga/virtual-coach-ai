$ErrorActionPreference = "Stop"

$vc = Join-Path $env:APPDATA "npm\node_modules\vercel\dist\vc.js"
if (-not (Test-Path $vc)) { throw "Missing vc.js: $vc" }

function Invoke-VercelText([string[]]$Args) {
  $tmp = Join-Path $env:TEMP ("vercel_out_{0}.txt" -f ([guid]::NewGuid().ToString("N")))
  try {
    cmd /c "node ""$vc"" $($Args -join ' ') > ""$tmp"" 2>&1" | Out-Null
    $txt = Get-Content -Raw $tmp
    ($txt -split "`r?`n" | Where-Object { $_ -notmatch '^\s*Vercel CLI\s+\d+\.\d+\.\d+' }) -join "`r`n"
  } finally {
    Remove-Item -Force $tmp -ErrorAction SilentlyContinue
  }
}

Write-Host "=== Deploying PRODUCTION ===" -ForegroundColor Cyan
$out = Invoke-VercelText @("--prod")

# Extract Production URL
$prod = ($out -split "`r?`n" | Where-Object { $_ -match '^\s*(Production:|✅\s+Production:)\s*(https://[^\s]+\.vercel\.app)\s*$' } |
  ForEach-Object { [regex]::Match($_,'https://[^\s]+\.vercel\.app').Value } | Select-Object -First 1)

if (-not $prod) {
  $prod = ([regex]::Match($out, 'https://[^\s]+\.vercel\.app')).Value
}

if (-not $prod) {
  throw ("Could not find Production URL in output.`n--- RAW ---`n{0}" -f $out)
}

Write-Host ("Using URL: {0}" -f $prod) -ForegroundColor Green

$body = @{ uploadId="demo-123"; activePhase="P5" } | ConvertTo-Json
$r = Invoke-WebRequest -Method Post -Uri "$prod/api/pose-estimate" -ContentType "application/json" -Body $body -UseBasicParsing

"STATUS: $($r.StatusCode)"
"CONTENT-TYPE: $($r.Headers['Content-Type'])"
"X-MATCHED-PATH: $($r.Headers['x-matched-path'])"
"FIRST-120:`n$($r.Content.Substring(0,[Math]::Min(120, $r.Content.Length)))"

$img = Invoke-WebRequest -Uri "$prod/pose-demo.jpg" -UseBasicParsing
"POSE-DEMO STATUS: $($img.StatusCode)"
