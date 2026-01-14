Set-Location C:\Sites\virtual-coach-ai

$m = ".\middleware.ts"
if (-not (Test-Path $m)) { throw "Missing: $m" }

$txt = Get-Content $m -Raw

# If there isn't a middleware export, bail (unexpected project layout)
if ($txt -notmatch "export\s+function\s+middleware") {
  throw "middleware.ts does not appear to export function middleware(req). Open it and we’ll patch manually."
}

# Insert (or replace) a DEMO PUBLIC BYPASS block near the top of middleware()
# We match the start of the function and inject immediately after opening brace.
$block = @"
  // === DEMO MODE: public routes (temporary) ===
  // Keep demo flows frictionless while we build. Tighten later.
  const pathname = req.nextUrl.pathname;

  // Always allow Next internals & common public files
  if (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next();
  }

  // Allow demo/report/data assets (no auth)
  if (
    pathname.startsWith('/report-beta') ||
    pathname.startsWith('/data/') ||
    pathname.startsWith('/frames/') ||
    pathname.startsWith('/uploads/') ||
    pathname.startsWith('/api/upload') ||
    pathname.startsWith('/api/report') ||
    pathname.startsWith('/api/analyze')
  ) {
    return NextResponse.next();
  }

  // === END DEMO MODE BYPASS ===

"@

# Remove any older DEMO MODE block first (so it doesn't duplicate)
$txt = [regex]::Replace($txt, "(?s)\s*// === DEMO MODE: public routes.*?// === END DEMO MODE BYPASS ===\s*", "`n")

$txt = [regex]::Replace(
  $txt,
  "(export\s+function\s+middleware\s*\(\s*req[^\)]*\)\s*\{\s*)",
  "`$1`n$block",
  1
)

Set-Content -Encoding UTF8 -Path $m -Value $txt
Write-Host "✅ middleware.ts updated: demo routes are PUBLIC" -ForegroundColor Green

# Restart clean
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .\.next
npm run dev
