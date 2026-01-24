$ErrorActionPreference = "Stop"
Set-Location C:\Sites\virtual-coach-ai

$roots = @(".\app",".\components",".\public") | Where-Object { Test-Path $_ }

# Grab real files first, then search them (avoids -Recurse on Select-String)
$files = foreach($r in $roots){
  Get-ChildItem -Path $r -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx,*.json,*.html,*.css -ErrorAction SilentlyContinue
}

if(-not $files -or $files.Count -eq 0){
  Write-Host "OK: No files found under app/components/public to scan." -ForegroundColor Yellow
  exit 0
}

$terms = @(
  "<video", "</video", "video", "Video",
  "ReactPlayer", "MuxPlayer", "mux", "playbackId",
  "m3u8", ".m3u8", ".mp4",
  "hls", "dash", "controls=", "poster=",
  "replay", "Replay", "watch", "Watch",
  "src=", "href=", "play", "Play"
)

$hits = New-Object System.Collections.Generic.List[object]

foreach($t in $terms){
  $m = $files | Select-String -SimpleMatch -Pattern $t -ErrorAction SilentlyContinue
  foreach($h in $m){
    $hits.Add([pscustomobject]@{
      Path = $h.Path
      LineNumber = $h.LineNumber
      Term = $t
      Line = ($h.Line | ForEach-Object { $_.Trim() })
    }) | Out-Null
  }
}

if($hits.Count -eq 0){
  Write-Host "OK: No replay/video implementation found in app/components/public." -ForegroundColor Green
  Write-Host "If you saw a replay video on screen, it is NOT coming from this repo (or it was already removed)." -ForegroundColor DarkGray
} else {
  Write-Host "FOUND: Video/replay-related references (review list):" -ForegroundColor Yellow
  $hits |
    Sort-Object Path, LineNumber |
    Select-Object Path, LineNumber, Term, Line |
    Format-Table -AutoSize
}
