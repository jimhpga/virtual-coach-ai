param()

$ErrorActionPreference = "Stop"

$repo = "C:\Sites\virtual-coach-ai"
Set-Location $repo

$fp = Join-Path $repo "app\api\analyze-swing\route.ts"
if(-not (Test-Path $fp)){ throw "Missing: $fp" }

# ---------- Backup ----------
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$bakLocal = "$fp.bak_cleanDedup_$ts"
Copy-Item $fp $bakLocal -Force

$bakDirE = "E:\Backups\VCA\_snapshots"
if(Test-Path "E:\"){
  New-Item -ItemType Directory -Path $bakDirE -Force | Out-Null
  $bakE = Join-Path $bakDirE ("route.ts.bak_cleanDedup_{0}.ts" -f $ts)
  Copy-Item $fp $bakE -Force
}

Write-Host "✅ Backup local: $bakLocal" -ForegroundColor DarkGray
if($bakE){ Write-Host "✅ Backup E:     $bakE" -ForegroundColor DarkGray }

# ---------- Load ----------
$txt = Get-Content $fp -Raw -Encoding UTF8

function Remove-AllBlocks {
  param(
    [string]$Text,
    [string]$StartMarker,
    [string]$EndMarker
  )
  $pat = [regex]::Escape($StartMarker) + ".*?" + [regex]::Escape($EndMarker)
  return [regex]::Replace($Text, $pat, "", [System.Text.RegularExpressions.RegexOptions]::Singleline)
}

# 1) Kill ALL MVP DEMO GUARDRAILS blocks (these referenced debug/miniPose/latestPose)
$txt2 = $txt
$txt2 = Remove-AllBlocks -Text $txt2 `
  -StartMarker "// ===== MVP DEMO GUARDRAILS" `
  -EndMarker   "// ===== END MVP DEMO GUARDRAILS ====="

# 2) Kill ALL MVP re-assert blocks (duplicated noise)
$txt2 = Remove-AllBlocks -Text $txt2 `
  -StartMarker "// ===== MVP: re-assert latest pose if loader populated a path =====" `
  -EndMarker   "// ===== END MVP re-assert ====="

# 3) Keep ONLY the FIRST "FORCE LATEST POSE LOAD (demo path) + breadcrumbs" block; remove the rest
$start = "// ===== MVP: FORCE LATEST POSE LOAD (demo path) + breadcrumbs ====="
$end   = "// ===== END MVP latest pose prefer ====="

$blockPat = [regex]::Escape($start) + ".*?" + [regex]::Escape($end)
$matches = [regex]::Matches($txt2, $blockPat, [System.Text.RegularExpressions.RegexOptions]::Singleline)

if($matches.Count -gt 1){
  # Keep the first, remove the rest (from the bottom up to not invalidate indices)
  for($i = $matches.Count - 1; $i -ge 1; $i--){
    $m = $matches[$i]
    $txt2 = $txt2.Remove($m.Index, $m.Length)
  }
  Write-Host ("✅ Deduped FORCE LATEST POSE LOAD blocks: kept 1, removed {0}" -f ($matches.Count - 1)) -ForegroundColor Green
} elseif($matches.Count -eq 1) {
  Write-Host "✅ FORCE LATEST POSE LOAD block already single (1)" -ForegroundColor Green
} else {
  Write-Host "⚠️ No FORCE LATEST POSE LOAD block found (nothing to dedupe there)." -ForegroundColor Yellow
}

# 4) (Optional) Remove repeated MVP TOP-LEVEL DEBUG blocks if they ever got duplicated
$topStart = "// ===== MVP TOP-LEVEL DEBUG (AUTO) ====="
$topEnd   = "// ===== END MVP TOP-LEVEL DEBUG (AUTO) ====="
$topPat   = [regex]::Escape($topStart) + ".*?" + [regex]::Escape($topEnd)
$topMatches = [regex]::Matches($txt2, $topPat, [System.Text.RegularExpressions.RegexOptions]::Singleline)
if($topMatches.Count -gt 1){
  for($i = $topMatches.Count - 1; $i -ge 1; $i--){
    $m = $topMatches[$i]
    $txt2 = $txt2.Remove($m.Index, $m.Length)
  }
  Write-Host ("✅ Deduped MVP TOP-LEVEL DEBUG blocks: kept 1, removed {0}" -f ($topMatches.Count - 1)) -ForegroundColor Green
}

# ---------- Save ----------
# Normalize line endings to LF for stability (Next/SWC is fine with either; this prevents weird merges)
$txt2 = $txt2 -replace "`r`n", "`n"
Set-Content -Path $fp -Value $txt2 -Encoding UTF8

Write-Host "✅ Wrote cleaned route.ts" -ForegroundColor Green

# ---------- Quick sanity checks ----------
# Ensure we didn't leave references to known “ghost vars” from the broken guardrails
$bad = @("miniPose","miniComputedPose","latestPose","latestComputedPose","debug = { ...","debug ??")
$hits = @()
foreach($b in $bad){
  $m = Select-String -Path $fp -Pattern $b -SimpleMatch -ErrorAction SilentlyContinue
  if($m){ $hits += $b }
}
if($hits.Count -gt 0){
  Write-Host "⚠️ Found these leftover tokens (may be legit, may not):" -ForegroundColor Yellow
  $hits | Sort-Object -Unique | ForEach-Object { Write-Host ("   - " + $_) -ForegroundColor Yellow }
}

# ---------- Restart + run your test ----------
Write-Host "`n▶️ Restarting dev server..." -ForegroundColor Cyan
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force | Out-Null

# Start dev server in a new window (so this script can continue)
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d $repo && npm run dev" | Out-Null

Write-Host "⏳ Give it a few seconds to compile..." -ForegroundColor DarkGray
Start-Sleep -Seconds 6

$test = Join-Path $repo "scripts\Test-AnalyzeSwing.ps1"
if(Test-Path $test){
  Write-Host "`n▶️ Running Test-AnalyzeSwing.ps1..." -ForegroundColor Cyan
  powershell -ExecutionPolicy Bypass -File $test
} else {
  Write-Host "⚠️ Test script not found at: $test" -ForegroundColor Yellow
  Write-Host "Run: powershell -ExecutionPolicy Bypass -File .\scripts\Test-AnalyzeSwing.ps1" -ForegroundColor Yellow
}
