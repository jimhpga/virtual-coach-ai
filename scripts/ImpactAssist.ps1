function Get-VideoDurationSec {
  param([Parameter(Mandatory=$true)][string]$VideoPath)
  $dur = & ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$VideoPath"
  return [double]$dur
}

function New-ImpactAssistFrames {
  param(
    [Parameter(Mandatory=$true)][string]$VideoPath,
    [Parameter(Mandatory=$true)][string]$OutDir,
    [double]$ImpactSec = -1,
    [double]$PreSec = 0.55,
    [double]$PostSec = 0.15
  )

  if (!(Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }

  $dur = Get-VideoDurationSec -VideoPath $VideoPath

  # If impact not provided, create a generic scrub range near end (works for most "10s swing" captures)
  if ($ImpactSec -lt 0) {
    $ImpactSec = [Math]::Max(0.0, $dur * 0.80)
  }

  $winStart = [Math]::Max(0.0, $ImpactSec - $PreSec)
  $winEnd   = [Math]::Min($dur, $ImpactSec + $PostSec)
  $winLen   = [Math]::Max(0.001, ($winEnd - $winStart))

  # 9 evenly spaced frame times across the window
  $step = $winLen / 8.0

  $frames = @{}
  $times  = @()

  for ($i=0; $i -lt 9; $i++) {
    $t = $winStart + ($step * $i)
    $times += [Math]::Round($t, 4)
    $outFile = Join-Path $OutDir ("p{0}.jpg" -f ($i+1))

    & ffmpeg -y -hide_banner -loglevel error -ss $t -i "$VideoPath" -frames:v 1 -q:v 2 -update 1 "$outFile" | Out-Null

    $frames["P$($i+1)"] = $outFile
  }

  return [pscustomobject]@{
    ok=$true
    video=$VideoPath
    durationSec=[Math]::Round($dur,3)
    impactSec=[Math]::Round($ImpactSec,3)
    window=@{
      start=[Math]::Round($winStart,3)
      end=[Math]::Round($winEnd,3)
      len=[Math]::Round($winLen,3)
      pre=$PreSec
      post=$PostSec
    }
    times=$times
    frames=$frames
  }
}
