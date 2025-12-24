param(
  [string]$ProjectDir = "C:\Sites\virtual-coach-ai",
  [string]$OutDir = "C:\Sites\_BACKUPS\virtual-coach-ai"
)

$ErrorActionPreference = "Stop"
Set-Location $ProjectDir

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$gitHash = (git rev-parse --short HEAD 2>$null)
if(-not $gitHash){ $gitHash = "nogit" }

New-Item -ItemType Directory -Force $OutDir | Out-Null

$zip = Join-Path $OutDir "virtual-coach-ai_$stamp_$gitHash.zip"

$exclude = @("node_modules","\.next","\.git","\.vercel","\.turbo","\.cache","_BACKUPS","_backups","_legacy_root_static","_legacy_public_html","_legacy_api")

$files = Get-ChildItem -Path $ProjectDir -Recurse -File | Where-Object {
  $full = $_.FullName
  foreach($x in $exclude){
    if($full -match "\\$x(\\|$)"){ return $false }
  }
  return $true
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipTmp = "$zip.tmp"
if(Test-Path $zipTmp){ Remove-Item $zipTmp -Force }

$zipArchive = [System.IO.Compression.ZipFile]::Open($zipTmp, 'Create')
foreach($f in $files){
  $rel = $f.FullName.Substring($ProjectDir.Length).TrimStart("\")
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipArchive, $f.FullName, $rel) | Out-Null
}
$zipArchive.Dispose()

Move-Item $zipTmp $zip -Force

$manifest = Join-Path $OutDir "manifest_$stamp_$gitHash.txt"
@(
  "timestamp=$stamp"
  "git=$gitHash"
  "project=$ProjectDir"
  "zip=$zip"
) | Set-Content -Encoding UTF8 $manifest

Write-Host "✅ Backup created: $zip"
Write-Host "✅ Manifest:      $manifest"
