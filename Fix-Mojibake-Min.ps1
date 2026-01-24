Set-Location C:\Sites\virtual-coach-ai

function Fix-MojiFile([string]$path){
  $full = (Resolve-Path $path).Path
  $bytes = [IO.File]::ReadAllBytes($full)
  $s = [Text.Encoding]::UTF8.GetString($bytes)

  if($s -notmatch 'â€”|â€“|â€™'){ return $false }

  $bak = "$full.bak_moji_$((Get-Date).ToString('yyyyMMdd_HHmmss'))"
  Copy-Item $full $bak -Force | Out-Null

  $s2 = $s -replace 'â€”','—' -replace 'â€“','–' -replace 'â€™','’'
  [IO.File]::WriteAllText($full, $s2, (New-Object System.Text.UTF8Encoding($false)))

  Write-Host "✅ Fixed: $path" -ForegroundColor Green
  Write-Host "   Backup: $bak" -ForegroundColor DarkGray
  return $true
}

$targets = Get-ChildItem .\app,.\public -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx,*.json,*.md,*.txt

$fixed = 0
foreach($f in $targets){
  if(Fix-MojiFile $f.FullName){ $fixed++ }
}

if($fixed -eq 0){
  Write-Host "ℹ️ No â€” â€“ â€™ found in app/ or public/. If you still SEE it, it's likely coming from runtime data (API JSON) or the browser cache." -ForegroundColor Yellow
} else {
  Write-Host "✅ Total files fixed: $fixed" -ForegroundColor Green
}

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item .\.next -Recurse -Force -ErrorAction SilentlyContinue
npm run dev
