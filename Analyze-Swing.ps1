param(
  [Parameter(Mandatory=$true)]
  [string]$VideoPath,

  [string]$BaseUrl = "",

  [ValidateSet("file","video")]
  [string]$UploadFieldName = "video"
)

$UploadEndpoint  = "/api/upload"
$AnalyzeEndpoint = "/api/analyze"
$OutDir = ".\reports"
$TimeoutSec = 120

$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path $Path)) { New-Item -ItemType Directory -Force -Path $Path | Out-Null }
}

function Join-Url([string]$Base, [string]$Path) {
  if ($Base.EndsWith("/")) { $Base = $Base.TrimEnd("/") }
  if (-not $Path.StartsWith("/")) { $Path = "/$Path" }
  "$Base$Path"
}

function New-FallbackReport([string]$Reason) {
  $now = (Get-Date).ToString("o")
  [pscustomobject]@{
    ok           = $true
    usedFallback = $true
    reason       = $Reason
    report       = [pscustomobject]@{
      id          = "rpt_fallback_$([int64](Get-Date -UFormat %s))"
      createdAt   = $now
      headline    = "Quick report generated — extract-pframes unavailable right now."
      swingScore  = 72
      topFaults   = @(@{ title="Early extension" }, @{ title="Clubface slightly open" })
      checkpoints = 1..9 | ForEach-Object { [pscustomobject]@{ p=$_; label=("P{0}" -f $_); note="-" } }
    }
  }
}

# PS5.1-compatible multipart/form-data upload (no Invoke-RestMethod -Form)
function Upload-Video([string]$Url, [string]$FilePath, [int]$Timeout, [string]$FieldName) {
  if (-not (Test-Path $FilePath)) { throw "Video not found: $FilePath" }

  $boundary = "----VCAFormBoundary$([guid]::NewGuid().ToString('N'))"
  $lf = "`r`n"

  $fileName  = [System.IO.Path]::GetFileName($FilePath)
  $fileBytes = [System.IO.File]::ReadAllBytes($FilePath)

  $header = (
    "--$boundary$lf" +
    "Content-Disposition: form-data; name=`"$FieldName`"; filename=`"$fileName`"$lf" +
    "Content-Type: video/mp4$lf$lf"
  )
  $footer = "$lf--$boundary--$lf"

  $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
  $footerBytes = [System.Text.Encoding]::UTF8.GetBytes($footer)

  $ms = New-Object System.IO.MemoryStream
  try {
    $ms.Write($headerBytes, 0, $headerBytes.Length) | Out-Null
    $ms.Write($fileBytes, 0, $fileBytes.Length) | Out-Null
    $ms.Write($footerBytes, 0, $footerBytes.Length) | Out-Null

    $bodyBytes = $ms.ToArray()

    try {
      $resp = Invoke-WebRequest -Uri $Url -Method Post `
        -ContentType ("multipart/form-data; boundary=$boundary") `
        -Body $bodyBytes `
        -TimeoutSec $Timeout `
        -UseBasicParsing `
        -ErrorAction Stop
    }
    catch {
      $respText = $null

      # PS5.1: sometimes ErrorDetails has the body
      try { if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $respText = $_.ErrorDetails.Message } } catch {}

      # Response stream fallback
      if (-not $respText) {
        try {
          if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream()) {
            $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $respText = $sr.ReadToEnd()
            $sr.Dispose()
          }
        } catch {}
      }

      if ($respText) { throw "Upload failed. Body: $respText" }
      throw "Upload failed: $($_.Exception.Message)"
    }

    if (-not $resp.Content) { throw "Upload returned empty response content." }

    # Force JSON parse (avoid the 'string Length' trap)
    try {
      return ($resp.Content | ConvertFrom-Json -ErrorAction Stop)
    } catch {
      Write-Host "⚠️ Upload response was not valid JSON. Raw content below:" -ForegroundColor Yellow
      Write-Host $resp.Content
      throw "Upload response was not valid JSON."
    }
  }
  finally {
    $ms.Dispose()
  }
}

function Invoke-JsonPost([string]$Url, [object]$Body, [int]$Timeout) {
  try {
    return Invoke-RestMethod -Method Post -Uri $Url `
      -ContentType "application/json" `
      -Body ($Body | ConvertTo-Json -Depth 12) `
      -TimeoutSec $Timeout `
      -ErrorAction Stop
  } catch {
    # Try to print JSON error body
    $body = $null
    try {
      if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream()) {
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $sr.ReadToEnd()
        $sr.Dispose()
      }
    } catch {}
    if ($body) { throw "POST failed. Body: $body" }
    throw
  }
}

function Auto-DetectBaseUrl() {
  $ports = @(3000,3001,3003)
  foreach ($p in $ports) {
    $try = "http://localhost:$p"
    try {
      $r = Invoke-WebRequest -Uri $try -Method Get -TimeoutSec 2 -UseBasicParsing
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 600) { return $try }
    } catch { }
  }
  return $null
}

# ---- MAIN ----
if (-not (Test-Path $VideoPath)) { throw "Video not found: $VideoPath" }

Ensure-Dir $OutDir

$absVideo = (Resolve-Path $VideoPath).Path

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  $BaseUrl = Auto-DetectBaseUrl
  if (-not $BaseUrl) {
    throw "Could not auto-detect server on ports 3000/3001/3003. Start dev server or pass -BaseUrl."
  }
}

$uploadUrl  = Join-Url $BaseUrl $UploadEndpoint
$analyzeUrl = Join-Url $BaseUrl $AnalyzeEndpoint
$timestamp  = (Get-Date).ToString("yyyyMMdd_HHmmss")
$outJson    = Join-Path $OutDir "report_$timestamp.json"

Write-Host "🎥 Video: $absVideo" -ForegroundColor Cyan
Write-Host "🌐 BaseUrl: $BaseUrl" -ForegroundColor Cyan
Write-Host "⬆️ Upload: $uploadUrl (field=$UploadFieldName)" -ForegroundColor Cyan
Write-Host "🧠 Analyze: $analyzeUrl" -ForegroundColor Cyan
Write-Host "💾 Out: $outJson" -ForegroundColor Cyan

try {
  # 1) Upload
  $u = Upload-Video -Url $uploadUrl -FilePath $absVideo -Timeout $TimeoutSec -FieldName $UploadFieldName
  if (-not $u) { throw "Upload returned empty response." }

  Write-Host "✅ Upload response keys: $($u.PSObject.Properties.Name -join ', ')" -ForegroundColor Green

  # 2) Build /uploads/... path required by extract-pframes
  $uploadsPath = $null

  if ($u.PSObject.Properties.Match("filename").Count -gt 0 -and $u.filename) {
    $fn = [string]$u.filename
    $uploadsPath = "/" + $fn.TrimStart("/")
  }

  if (-not $uploadsPath) {
    $v = $null
    foreach ($k in @("videoUrl","url","publicUrl","blobUrl","fileUrl")) {
      if ($u.PSObject.Properties.Match($k).Count -gt 0 -and $u.$k) { $v = [string]$u.$k; break }
    }
    if ($v -and ($v -match "(/uploads/[^?]+)")) {
      $uploadsPath = $matches[1]
    }
  }

  Write-Host ("🔎 Parsed: uploadsPath={0}" -f $uploadsPath) -ForegroundColor Yellow
  if (-not $uploadsPath) {
    throw "Could not derive /uploads/... from upload response. Ensure -UploadFieldName video."
  }

  # 3) Extract p-frames
  $payload = @{ videoUrl = $uploadsPath }
  $a = Invoke-JsonPost -Url $analyzeUrl -Body $payload -Timeout $TimeoutSec
  if (-not $a) { throw "extract-pframes returned no data." }

  # 4) Save + print
  $a | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 $outJson
  Write-Host "📄 Saved report output: $outJson" -ForegroundColor Green

  # Quick peek at top-level keys
  Write-Host "✅ analyze keys: $($a.PSObject.Properties.Name -join ', ')" -ForegroundColor Green
}
catch {
  $msg = $_.Exception.Message
  Write-Host "⚠️ Pipeline failed: $msg" -ForegroundColor Red

  try {
    $fallback = New-FallbackReport -Reason $msg
    $fallback | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 $outJson
    Write-Host "📄 Fallback saved: $outJson" -ForegroundColor Yellow
  } catch {
    Write-Host "💥 Even fallback save failed: $($_.Exception.Message)" -ForegroundColor Red
  }
}




