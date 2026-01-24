param()

# Always resolve the script folder safely
$ScriptDir = Split-Path -Parent $PSCommandPath
if(-not $ScriptDir){
  throw "Could not resolve script directory (PSCommandPath is empty)."
}

Set-Location $ScriptDir

# Repo root is parent of /scripts
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $RepoRoot

Write-Host "== VCA Smoke Test ==" -ForegroundColor Cyan
Write-Host ("Repo: " + (Get-Location).Path) -ForegroundColor Cyan

if(-not (Test-Path .\package.json)){
  throw ("package.json not found at repo root: " + (Get-Location).Path)
}

# Kill node to avoid .next locks
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Clean build cache
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .\.next

# Install + run
npm install
npm run dev
