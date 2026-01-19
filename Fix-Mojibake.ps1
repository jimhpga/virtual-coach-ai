Set-Location C:\Sites\virtual-coach-ai

function Write-Utf8NoBom($path, $content){
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Resolve-Path $path).Path, $content, $utf8NoBom)
}

# Converts common mojibake (UTF8 bytes mis-decoded as Latin1/Win1252) back to real UTF8
function Fix-Moji($s){
  $latin1 = [System.Text.Encoding]::GetEncoding(28591)  # ISO-8859-1
  $utf8   = [System.Text.Encoding]::UTF8
  $bytes  = $latin1.GetBytes($s)
  return $utf8.GetString($bytes)
}

$stamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$bkdir = ".\_backup_mojibake_$stamp"
New-Item -ItemType Directory -Force $bkdir | Out-Null

$files = Get-ChildItem -Recurse -File -Include *.ts,*.tsx |
  Where-Object {
    $_.FullName -notmatch '\\node_modules\\' -and
    $_.FullName -notmatch '\\.next\\' -and
    $_.FullName -notmatch '\\_backup'
  }

$changed = @()

foreach($f in $files){
  $raw = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)

  # Only attempt fix if it looks suspicious
  if($raw -match "Ãƒ|Ã‚"){
    $fixed = Fix-Moji $raw

    # Apply only if it reduces the suspicious markers
    $before = ([regex]::Matches($raw,   "Ãƒ|Ã‚")).Count
    $after  = ([regex]::Matches($fixed, "Ãƒ|Ã‚")).Count

    if($after -lt $before){
      Copy-Item $f.FullName (Join-Path $bkdir $f.Name) -Force
      Write-Utf8NoBom $f.FullName $fixed
      $changed += $f.FullName
    }
  }
}

"`nDONE. Backup folder: $bkdir"
"Files changed: $($changed.Count)"
if($changed.Count -gt 0){ $changed | ForEach-Object { " - $_" } }

"`nRemaining suspicious hits (first 80):"
Get-ChildItem -Recurse -File -Include *.ts,*.tsx |
  Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\.next\\' -and $_.FullName -notmatch '\\_backup' } |
  Select-String -Pattern "Ãƒ|Ã‚" |
  Select-Object -First 80
