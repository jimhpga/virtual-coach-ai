Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-VideoDurationSec {
  param([Parameter(Mandatory=$true)][string]$Path)

  $durText = & ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$Path" 2>$null
  $durText = ($durText | Out-String).Trim()
  if (-not $durText) { throw "ffprobe returned empty duration" }

  return [double]::Parse($durText, [System.Globalization.CultureInfo]::InvariantCulture)
}

function Get-ImpactMotionSec {
  param(
    [Parameter(Mandatory=$true)][string]$VideoPath,
    [double]$SearchTailSec = 3.0,
    [int]$Fps = 60,
    [int]$ScaleW = 240
  )

  if (-not (Test-Path $VideoPath)) {
    return [pscustomobject]@{ ok=$false; impactSec=$null; confidenceRatio=0; reason="VideoPath not found"; search=@{start=$null; end=$null} }
  }

  $dur = Get-VideoDurationSec $VideoPath
  $ss  = [Math]::Max(0, $dur - $SearchTailSec)
  $len = [Math]::Min($SearchTailSec, $dur - $ss)
  $EndSec = $ss + $len

  $tmp = Join-Path $env:TEMP ("vcai_framemd5_{0}.txt" -f ([guid]::NewGuid().ToString("N")))

  try {
    ffmpeg -hide_banner -loglevel error `
      -ss $ss -t $len -i "$VideoPath" `
      -vf "fps=$Fps,scale=${ScaleW}:-1,format=gray" `
      -f framemd5 "$tmp" | Out-Null

    $md = Get-Content $tmp | Where-Object { $_ -match '[0-9A-Fa-f]{32}$' }

    $hashes = @()
    foreach ($line in $md) {
      $parts = ($line -split '\s+') | Where-Object { $_ }
      if ($parts.Count -gt 0) { $hashes += $parts[-1] }
    }

    if ($hashes.Count -lt 20) {
      return [pscustomobject]@{ ok=$false; impactSec=$null; confidenceRatio=0; reason="Not enough frames parsed"; search=@{start=[Math]::Round($ss,3); end=[Math]::Round($EndSec,3)} }
    }

    $changes = @()
    for ($i=1; $i -lt $hashes.Count; $i++) {
      $changes += [int]($hashes[$i] -ne $hashes[$i-1])
    }

    $win = [Math]::Max(6, [Math]::Min(20, [int]($Fps/6))) # small window, ~0.1-0.3s
    $bestSum = -1
    $bestIdx = 0

    for ($i=0; $i -le ($changes.Count - $win); $i++) {
      $s = 0
      for ($k=0; $k -lt $win; $k++) { $s += $changes[$i+$k] }
      if ($s -gt $bestSum) { $bestSum = $s; $bestIdx = $i }
    }

    $impact = $ss + ($bestIdx / [double]$Fps)
    $confidence = if ($win -gt 0) { [Math]::Round(($bestSum / [double]$win), 2) } else { 0 }

    return [pscustomobject]@{
      ok = $true
      impactSec = [Math]::Round($impact, 3)
      confidenceRatio = $confidence
      reason = $null
      search = @{ start=[Math]::Round($ss,3); end=[Math]::Round($EndSec,3) }
    }
  }
  finally {
    if (Test-Path $tmp) { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
  }
}


