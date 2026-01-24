$ErrorActionPreference = "Stop"

$fp = "C:\Sites\virtual-coach-ai\app\report-beta\full\FullClient.tsx"
if (!(Test-Path $fp)) { throw "File not found: $fp" }

$bak = "$fp.bak_nullmaps_{0}.tsx" -f (Get-Date -Format yyyyMMdd_HHmmss)
Copy-Item $fp $bak -Force

$raw = Get-Content -Path $fp -Raw

function Replace-All {
  param(
    [string]$Text,
    [string]$Find,
    [string]$Replace
  )
  return $Text.Replace($Find, $Replace)
}

# Hard swap ONLY the exact patterns we expect (SimpleMatch behavior).
# If your file uses different spacing, we also do a regex pass below.
$raw2 = $raw
$raw2 = Replace-All $raw2 '{c.drills.map((x, i) => <li key={i}>{x}</li>)}' '{(c.drills ?? []).map((x, i) => <li key={i}>{x}</li>)}'
$raw2 = Replace-All $raw2 '{c.coachNotes.map((x, i) => <li key={i}>{x}</li>)}' '{(c.coachNotes ?? []).map((x, i) => <li key={i}>{x}</li>)}'
$raw2 = Replace-All $raw2 '{c.commonMisses.map((x, i) => <li key={i}>{x}</li>)}' '{(c.commonMisses ?? []).map((x, i) => <li key={i}>{x}</li>)}'

# Regex backups (handles whitespace variants). Safe: only wraps "c.<field>.map(".
$raw2 = [regex]::Replace($raw2, '\{(\s*)c\.drills\s*\.map\(', '{${1}(c.drills ?? []).map(')
$raw2 = [regex]::Replace($raw2, '\{(\s*)c\.coachNotes\s*\.map\(', '{${1}(c.coachNotes ?? []).map(')
$raw2 = [regex]::Replace($raw2, '\{(\s*)c\.commonMisses\s*\.map\(', '{${1}(c.commonMisses ?? []).map(')

if ($raw2 -eq $raw) {
  Write-Host "⚠️ No changes detected. That means your file doesn't contain the expected patterns (or already patched)." -ForegroundColor Yellow
  Write-Host "Backup: $bak" -ForegroundColor DarkGray
} else {
  Set-Content -Path $fp -Value $raw2 -Encoding UTF8
  Write-Host "✅ Patched null-safe .map() for pcheck arrays (drills/coachNotes/commonMisses)." -ForegroundColor Green
  Write-Host ("Backup: {0}" -f $bak) -ForegroundColor DarkGray
}

Write-Host "`nVERIFY (should show ?? [] in the pchecks render region):" -ForegroundColor DarkGray
Select-String -Path $fp -Pattern "c.drills ??", "c.coachNotes ??", "c.commonMisses ??" -SimpleMatch | Select-Object -First 30
