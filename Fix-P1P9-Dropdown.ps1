$ErrorActionPreference = "Stop"

$fp = "C:\Sites\virtual-coach-ai\app\report-beta\full\FullClient.tsx"
if (!(Test-Path $fp)) { throw "File not found: $fp" }

$bak = "$fp.bak_p1p9_dropdown_{0}.tsx" -f (Get-Date -Format yyyyMMdd_HHmmss)
Copy-Item $fp $bak -Force

$lines = Get-Content -Path $fp

function FindRenderedLineIndex {
  param([string[]]$Lines, [string]$Regex, [int]$StartAt = 0)
  for ($i = $StartAt; $i -lt $Lines.Count; $i++) {
    $ln = $Lines[$i]
    if (($ln -match $Regex) -and ($ln -notmatch 'titleMain\s*=') -and ($ln -notmatch 'title:\s*"')) { return $i }
  }
  return -1
}

# Remove ONLY our prior wrapper (identified by the summary text)
$out = New-Object System.Collections.Generic.List[string]
$skip = $false
for ($i=0; $i -lt $lines.Count; $i++){
  $ln = $lines[$i]
  if (-not $skip -and $ln -match '^\s*<details\b') {
    $isOurs = $false
    for ($j=$i; $j -lt [Math]::Min($i+200,$lines.Count); $j++){
      if ($lines[$j] -match 'Tap to expand / collapse') { $isOurs = $true; break }
      if ($lines[$j] -match '^\s*</details>\s*$') { break }
    }
    if ($isOurs) { $skip = $true; continue }
  }
  if ($skip) {
    if ($ln -match '^\s*</details>\s*$') { $skip = $false }
    continue
  }
  $out.Add($ln) | Out-Null
}
$lines = $out.ToArray()

# Find rendered header line (avoid fancy dash; match P1..P9 and the word Checkpoints)
$hdrIdx = FindRenderedLineIndex -Lines $lines -Regex 'P1.*P9.*Checkpoints' -StartAt 0
if ($hdrIdx -lt 0) { $hdrIdx = FindRenderedLineIndex -Lines $lines -Regex 'Checkpoints' -StartAt 0 }
if ($hdrIdx -lt 0) { throw "Could not find rendered P1..P9 Checkpoints section." }

# Find where practice plan is rendered (NOT the data definition at top)
# Anchor to the PRACTICE PLAN render marker
$planIdx = FindRenderedLineIndex -Lines $lines -Regex '\{\s*/\*\s*PRACTICE PLAN\s*\*/\s*\}' -StartAt ($hdrIdx+1)
if ($planIdx -lt 0) {
  $planIdx = FindRenderedLineIndex -Lines $lines -Regex 'Panel title=\{data\.practicePlan\.title\}' -StartAt ($hdrIdx+1)
}
if ($planIdx -lt 0) { throw "Could not find practice plan render block after P1..P9." }

$openBlock = @(
  "<details open style={{ marginTop: 10 }}>",
  "  <summary style={{",
  "    cursor: `"pointer`",",
  "    listStyle: `"none`",",
  "    display: `"flex`",",
  "    alignItems: `"center`",",
  "    justifyContent: `"space-between`",",
  "    gap: 10,",
  "    padding: `"8px 10px`",",
  "    borderRadius: 12,",
  "    border: `"1px solid rgba(255,255,255,0.10)`",",
  "    background: `"rgba(0,0,0,0.18)`"",
  "  }}>",
  "    <span style={{ fontSize: 12, opacity: 0.85, fontWeight: 800 }}>P1-P9 Checkpoints</span>",
  "    <span style={{ fontSize: 12, opacity: 0.75 }}>Tap to expand / collapse</span>",
  "  </summary>"
)

$new = New-Object System.Collections.Generic.List[string]
for ($i=0; $i -lt $lines.Count; $i++){
  if ($i -eq $hdrIdx) { foreach($x in $openBlock){ $new.Add($x) | Out-Null } }
  if ($i -eq $planIdx) { $new.Add("</details>") | Out-Null }
  $new.Add($lines[$i]) | Out-Null
}

Set-Content -Path $fp -Value $new.ToArray() -Encoding UTF8

Write-Host "OK: dropdown inserted around rendered P1-P9 section (ends right before Practice Plan render)." -ForegroundColor Green
Write-Host ("Backup: {0}" -f $bak) -ForegroundColor DarkGray

Write-Host "`nVERIFY:" -ForegroundColor DarkGray
Select-String -Path $fp -Pattern "<details open style={{ marginTop: 10 }}|Tap to expand / collapse|</details>|/* PRACTICE PLAN */|Panel title={data.practicePlan.title}" -SimpleMatch -Context 0,1
