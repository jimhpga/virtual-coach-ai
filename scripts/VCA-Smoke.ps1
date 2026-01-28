param(
  [string]$BaseUrl = "http://localhost:3000",
  [switch]$SkipLive,
  [switch]$ParseOnly
)

if($ParseOnly){
  $errs = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $PSCommandPath), [ref]$null, [ref]$errs)
  if($errs -and $errs.Count){
    $errs | ForEach-Object { Write-Host ("❌ PARSE: {0}" -f $_.Message) -ForegroundColor Red }
    exit 2
  }
  Write-Host "✅ PARSE OK" -ForegroundColor Green
  exit 0
}

