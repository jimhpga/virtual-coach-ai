Set-Location C:\Sites\virtual-coach-ai

$p = ".\app\report-beta\ReportBetaClient.tsx"
if (-not (Test-Path $p)) { throw "Missing: $p" }

# Stop node to avoid file locks / stale compiles
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$txt = Get-Content $p -Raw

# 1) If there's a named import from react, ensure useEffect is inside it.
#    Example: import { useState, useMemo } from "react";
$namedPattern = "import\s*\{\s*([^}]*)\s*\}\s*from\s*['""]react['""]\s*;"

if ([regex]::IsMatch($txt, $namedPattern)) {
  $txt = [regex]::Replace($txt, $namedPattern, {
    param($m)
    $items = $m.Groups[1].Value.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    if ($items -notcontains "useEffect") { $items += "useEffect" }
    "import { " + ($items -join ", ") + " } from ""react"";"
  }, 1)
}
else {
  # 2) No named import from react found.
  #    Insert a clean import after 'use client'; (or at top if not found)
  $insertLine = "import { useEffect } from ""react"";"

  if (-not [regex]::IsMatch($txt, "(?m)^\s*import\s*\{\s*useEffect\s*\}\s*from\s*['""]react['""]\s*;")) {
    if ([regex]::IsMatch($txt, "(?m)^'use client';\s*$")) {
      $txt = [regex]::Replace($txt, "(?m)^'use client';\s*$", "'use client';`n`n$insertLine", 1)
    } else {
      $txt = "$insertLine`n$txt"
    }
  }
}

Set-Content -Encoding UTF8 -Path $p -Value $txt
Write-Host "✅ Ensured React import includes useEffect: $p" -ForegroundColor Green

# Show the top of the file so we can SEE the import is there
Write-Host "`n--- TOP OF FILE (first 25 lines) ---" -ForegroundColor Cyan
Get-Content $p -TotalCount 25

# Clean Next cache + restart
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .\.next
npm run dev
