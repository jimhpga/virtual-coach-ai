Set-Location C:\Sites\virtual-coach-ai

function Write-Utf8NoBom($path, $content){
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Resolve-Path $path).Path, $content, $utf8NoBom)
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

# Build "bad" strings using Unicode escapes (ASCII-safe script)
$replacements = @(
  # bullet variants
  @{ bad = "`u{00C3}`u{00A2}`u{00C2}`u{20AC}`u{00C2}`u{00A2}"; good = " - " }, # Ã¢Â€Â¢
  @{ bad = "`u{00C3}`u{00A2}`u{00E2}`u{201A}`u{00AC}`u{00C2}`u{00A2}"; good = " - " }, # Ã¢â‚¬Â¢

  # dashes
  @{ bad = "`u{00C3}`u{00A2}`u{00C2}`u{20AC}`u{00C2}`u{2013}"; good = "-" }, # Ã¢Â€Â–
  @{ bad = "`u{00C3}`u{00A2}`u{00C2}`u{20AC}`u{00C2}`u{2014}"; good = "-" }, # Ã¢Â€Â—

  # apostrophes / quotes
  @{ bad = "`u{00C3}`u{00A2}`u{00C2}`u{20AC}`u{00C2}`u{2122}"; good = "'" }, # Ã¢Â€Â™
  @{ bad = "`u{00C3}`u{00A2}`u{00E2}`u{201A}`u{00AC}`u{00E2}`u{201E}`u{00A2}"; good = "'" }, # Ã¢â‚¬â„¢
  @{ bad = "`u{00C3}`u{00A2}`u{00C2}`u{20AC}`u{00C2}`u{2018}"; good = "'" }, # Ã¢Â€Â‘ (left single quote)
  @{ bad = "`u{00C3}`u{00A2}`u{00C2}`u{20AC}`u{00C2}`u{0153}"; good = '"' }, # Ã¢Â€Âœ (left double quote -> often shows as œ)
  @{ bad = "`u{00C3}`u{00A2}`u{00C2}`u{20AC}`u{00C2}`u{009D}"; good = '"' }, # Ã¢Â€Â (right double quote sometimes lands here)

  # NBSP-ish pattern seen as "Â " (A-circumflex + space)
  @{ bad = "`u{00C2} "; good = " " }
)

$changed = @()

foreach($f in $files){
  $raw = Get-Content $f.FullName -Raw

  if($raw -match "[`u{00C2}`u{00C3}]"){
    $orig = $raw
    foreach($r in $replacements){
      $raw = $raw.Replace($r.bad, $r.good)
    }

    if($raw -ne $orig){
      Copy-Item $f.FullName (Join-Path $bkdir $f.Name) -Force
      Write-Utf8NoBom $f.FullName $raw
      $changed += $f.FullName
    }
  }
}

"`n✅ Mojibake cleanup complete."
"Backups: $bkdir"
"Files changed: $($changed.Count)"
if($changed.Count -gt 0){ $changed | ForEach-Object { " - $_" } }

"`n--- Remaining suspicious hits (first 60) ---"
Get-ChildItem -Recurse -File -Include *.ts,*.tsx |
  Where-Object {
    $_.FullName -notmatch '\\node_modules\\' -and
    $_.FullName -notmatch '\\.next\\' -and
    $_.FullName -notmatch '\\_backup'
  } |
  Select-String -Pattern "Ã¢|Ãƒ|Â" |
  Select-Object -First 60
