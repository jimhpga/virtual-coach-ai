Set-Location C:\Sites\virtual-coach-ai

$m = ".\middleware.ts"
if (-not (Test-Path $m)) { throw "Missing: $m" }

$txt = Get-Content $m -Raw

# 1) Remove the older small /data bypass block if present (the one we inserted earlier)
# It looks like:
# const pathname = req.nextUrl.pathname;
# // ✅ allow unauthenticated static/data assets ...
# if (pathname.startsWith('/data/')) { return NextResponse.next(); }
$txt = [regex]::Replace(
  $txt,
  "(?s)\s*const\s+pathname\s*=\s*req\.nextUrl\.pathname;\s*//\s*✅\s*allow\s+unauthenticated\s+static\/data\s+assets.*?return\s+NextResponse\.next\(\);\s*\}\s*",
  "`n"
)

# 2) Inside the DEMO MODE block, DO NOT redeclare pathname if middleware already declares it later.
# We'll keep a single pathname declaration by converting the DEMO MODE one to 'let pathname = ...'
$txt = [regex]::Replace(
  $txt,
  "(?m)^\s*const\s+pathname\s*=\s*req\.nextUrl\.pathname;\s*$",
  "  let pathname = req.nextUrl.pathname;",
  1
)

Set-Content -Encoding UTF8 -Path $m -Value $txt
Write-Host "✅ Fixed middleware.ts: removed duplicate pathname block" -ForegroundColor Green

# Show lines containing 'pathname' so we can verify only one declaration remains
Write-Host "`n--- pathname occurrences ---" -ForegroundColor Cyan
Select-String -Path $m -Pattern "pathname\s*="

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .\.next
npm run dev
