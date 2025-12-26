# Fix-VCA.ps1
# "Make it work" script: cleans common JSX/import mojibake + runs build.
# Run: powershell -ExecutionPolicy Bypass -File .\Fix-VCA.ps1

$ErrorActionPreference = "Stop"

function Write-Utf8NoBom([string]$path, [string]$text){
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $text, $utf8NoBom)
}

$root = (Get-Location).Path
$targets = @(
  "pages\index.tsx",
  "pages\upload.tsx",
  "pages\view.tsx",
  "pages\report.tsx",
  "pages\p1p9.tsx",
  "pages\demo-report.tsx",
  "pages\manual-anchors.tsx",
  "pages\manual-impact.tsx",
  "pages\reports\index.tsx"
) | ForEach-Object { Join-Path $root $_ } | Where-Object { Test-Path $_ }

Write-Host "Scanning files:" -ForegroundColor Cyan
$targets | ForEach-Object { Write-Host " - $_" }

$changed = @()

foreach($file in $targets){
  $raw = Get-Content $file -Raw

  $orig = $raw

  # 1) Fix Windows backslash import path mistakes:
  #    "..\components\BrandShell" -> "../components/BrandShell"
  $raw = $raw -replace 'from\s+"\.\\components\\BrandShell";', 'from "../components/BrandShell";'
  $raw = $raw -replace 'from\s+"\.\.\\components\\BrandShell";', 'from "../components/BrandShell";'
  $raw = $raw -replace 'from\s+"\.\.componentsBrandShell";', 'from "../components/BrandShell";'

  # 2) De-dupe BrandShell imports (keep first one)
  $lines = $raw -split "`r?`n"
  $out = New-Object System.Collections.Generic.List[string]
  $seen = $false
  foreach($ln in $lines){
    if($ln -match '^\s*import\s+BrandShell\s+from\s+["'']\.\./components/BrandShell["''];\s*$'){
      if(-not $seen){
        $out.Add($ln)
        $seen = $true
      } else {
        # drop duplicate
      }
    } else {
      $out.Add($ln)
    }
  }
  $raw = ($out -join "`r`n")

  # 3) Fix "->" in JSX text nodes (Next/Turbo can choke depending on context)
  # Replace "View sample report ->" with "View sample report →"
  $raw = $raw -replace 'View sample report\s*->', 'View sample report {"\u2192"}'
  $raw = $raw -replace 'Open demo analyzer report\s*->', 'Open demo analyzer report {"\u2192"}'

  # 4) Fix frame button labels if they got corrupted.
  # If any line contains "frame >" or "&gt;" or "< frame" as raw text, wrap it safely in {"..."}.
  # This is a surgical safe fix — text only.
  $raw = $raw -replace '(\s+)frame\s*&gt;', '$1{"frame >"}'
  $raw = $raw -replace '(\s+)frame\s*>', '$1{"frame >"}'
  $raw = $raw -replace '(\s+)<\s*frame', '$1{"< frame"}'

  if($raw -ne $orig){
    Write-Utf8NoBom $file $raw
    $changed += $file
  }
}

if($changed.Count -gt 0){
  Write-Host "`n✅ Updated files:" -ForegroundColor Green
  $changed | ForEach-Object { Write-Host " - $_" }
} else {
  Write-Host "`nNo edits needed in target files." -ForegroundColor Yellow
}

Write-Host "`nRunning build..." -ForegroundColor Cyan
npm run build
Write-Host "`n✅ Build finished." -ForegroundColor Green
