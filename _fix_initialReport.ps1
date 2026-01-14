Set-Location C:\Sites\virtual-coach-ai

$p = ".\app\report-beta\ReportBetaClient.tsx"
if (-not (Test-Path $p)) { throw "Missing: $p" }

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$txt = Get-Content $p -Raw

# Ensure 'use client' is at top (keep it there)
$txt = $txt -replace "(?m)^\s*['""]use client['""];\s*$\r?\n?", ""
$txt = "'use client';`n`n" + $txt.TrimStart()

# If initialReport symbol isn't defined anywhere, define it safely inside the component.
if ($txt -notmatch "(?m)^\s*(const|let|var)\s+initialReport\b") {

  # Insert after the start of ReportBetaClient function body: { ... }
  # Handles: function ReportBetaClient( ... ) {
  $txt2 = [regex]::Replace(
    $txt,
    "(function\s+ReportBetaClient\s*\([^)]*\)\s*\{\s*)",
    "`$1`n  // Ensure initialReport exists (golden fast-load support)`n  const initialReport: any = (typeof (arguments[0] as any)?.initialReport !== 'undefined') ? (arguments[0] as any).initialReport : null;`n",
    1
  )

  if ($txt2 -eq $txt) {
    # Handles: const ReportBetaClient = (...) => {
    $txt2 = [regex]::Replace(
      $txt,
      "(const\s+ReportBetaClient\s*=\s*\([^)]*\)\s*=>\s*\{\s*)",
      "`$1`n  // Ensure initialReport exists (golden fast-load support)`n  const initialReport: any = (typeof (arguments[0] as any)?.initialReport !== 'undefined') ? (arguments[0] as any).initialReport : null;`n",
      1
    )
  }

  $txt = $txt2
}

Set-Content -Encoding UTF8 -Path $p -Value $txt
Write-Host "✅ Defined initialReport in component scope (prevents ReferenceError)" -ForegroundColor Green

Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .\.next
npm run dev
