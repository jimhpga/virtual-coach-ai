#requires -Version 7.0
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ShotDir,
  [Parameter(Mandatory=$true)][string]$OutDir,
  [string]$ShaftJson = "",
  [string]$PoseJson  = "",
  [switch]$VerboseDebug
)

$ErrorActionPreference = "Stop"

function NormPhase([string]$p){
  if([string]::IsNullOrWhiteSpace($p)){ return "" }
  $q = $p.Trim().ToUpper()
  if($q -match '^P[0-9]+$'){ return $q }
  if($q -match '^[0-9]+$'){ return ("P" + $q) }
  if($q -match '^P_[0-9]+$'){ return ("P" + ($q -replace 'P_','')) }
  return $q
}
function ToDeg([double]$rad){ return $rad * 180.0 / [Math]::PI }
function AngleDeg([double]$x1,[double]$y1,[double]$x2,[double]$y2){ return ToDeg([Math]::Atan2(($y2-$y1), ($x2-$x1))) }
function Norm180([double]$deg){ $d=$deg; while($d -le -180){$d+=360}; while($d -gt 180){$d-=360}; return $d }
function StackDeg([double]$shaftDeg,[double]$armDeg){ return [Math]::Abs((Norm180 ($shaftDeg - $armDeg))) }

function ReadJson($p){
  if(-not (Test-Path -LiteralPath $p)){ return $null }
  $txt = Get-Content -LiteralPath $p -Raw
  if([string]::IsNullOrWhiteSpace($txt)){ return $null }
  return ($txt | ConvertFrom-Json)
}

function PickShaftJson([string]$dir){
  $v2 = Get-ChildItem -LiteralPath $dir -File -Filter "VCA_shaft_FINAL_V2*.json" -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch '(?i)\.meta\.json$' } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if($v2){ return $v2.FullName }

  $legacy = Get-ChildItem -LiteralPath $dir -File -Filter "VCA_shaft_FINAL*.json" -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -notmatch '(?i)\.meta\.json$' } |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if($legacy){ return $legacy.FullName }
  return ""
}
function PickPoseJson([string]$dir){
  $c = Get-ChildItem -LiteralPath $dir -File -Filter "pose_SAFEWIDE_sample1.json" -ErrorAction SilentlyContinue |
       Select-Object -First 1
  if($c){ return $c.FullName }
  $c2 = Get-ChildItem -LiteralPath $dir -File -Filter "pose_*.json" -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch '(?i)^phase_pose\.json$' } |
        Sort-Object Length -Descending | Select-Object -First 1
  if($c2){ return $c2.FullName }
  return ""
}

function IsPointLike($o){
  if($null -eq $o){ return $false }
  try{
    $n = $o.PSObject.Properties.Name
    return (($n -contains "x" -and $n -contains "y") -or ($n -contains "X" -and $n -contains "Y"))
  } catch { return $false }
}

function XY($pt){
  if($null -eq $pt){ return $null }
  # array [x,y]
  if($pt -is [System.Collections.IEnumerable] -and -not ($pt -is [string])){
    $a = @($pt)
    if($a.Count -ge 2){ return @([double]$a[0],[double]$a[1]) }
  }
  foreach($xk in @("x","X")){
    foreach($yk in @("y","Y")){
      try{
        if($pt.PSObject.Properties.Name -contains $xk -and $pt.PSObject.Properties.Name -contains $yk){
          return @([double]$pt.$xk, [double]$pt.$yk)
        }
      } catch {}
    }
  }
  return $null
}

function FindFirstLandmarkArray($node, [int]$depth){
  if($depth -le 0 -or $null -eq $node){ return $null }

  # array case
  if($node -is [System.Collections.IEnumerable] -and -not ($node -is [string])){
    $arr = @($node)
    if($arr.Count -ge 33 -and (IsPointLike $arr[0])){
      return $arr
    }
    # search inside first few elements
    $limit = [Math]::Min(3, $arr.Count)
    for($i=0; $i -lt $limit; $i++){
      $hit = FindFirstLandmarkArray $arr[$i] ($depth-1)
      if($null -ne $hit){ return $hit }
    }
    return $null
  }

  # object case
  try{
    foreach($pr in $node.PSObject.Properties){
      $hit = FindFirstLandmarkArray ($node.($pr.Name)) ($depth-1)
      if($null -ne $hit){ return $hit }
    }
  } catch {}
  return $null
}

function FindFrameNode($root, [int]$targetFrame, [int]$depth){
  if($depth -le 0 -or $null -eq $root){ return $null }

  # array case
  if($root -is [System.Collections.IEnumerable] -and -not ($root -is [string])){
    $arr = @($root)
    foreach($it in $arr){
      $hit = FindFrameNode $it $targetFrame ($depth-1)
      if($null -ne $hit){ return $hit }
    }
    return $null
  }

  # object: if it has any frame-ish field equal to target, return this node
  try{
    foreach($fk in @("frame","Frame","frameIndex","frame_index","i","I","index","Index")){
      if($root.PSObject.Properties.Name -contains $fk){
        $v = $root.$fk
        try{
          if([int]("$v") -eq $targetFrame){ return $root }
        } catch {}
      }
    }
  } catch {}

  # otherwise descend
  try{
    foreach($pr in $root.PSObject.Properties){
      $hit = FindFrameNode ($root.($pr.Name)) $targetFrame ($depth-1)
      if($null -ne $hit){ return $hit }
    }
  } catch {}
  return $null
}

function GetArmDegFromPose($poseRoot, [int]$frame){
  $node = FindFrameNode $poseRoot $frame 10
  if($null -eq $node){ return $null }

  $lm = FindFirstLandmarkArray $node 10
  if($null -eq $lm){ return $null }
  if(@($lm).Count -lt 16){ return $null }

  $LS = $lm[11]
  $LW = $lm[15]
  $p1 = XY $LS
  $p2 = XY $LW
  if($null -eq $p1 -or $null -eq $p2){ return $null }

  return (AngleDeg $p1[0] $p1[1] $p2[0] $p2[1])
}

# -------- resolve inputs --------
if([string]::IsNullOrWhiteSpace($ShaftJson)){ $ShaftJson = PickShaftJson $ShotDir }
if([string]::IsNullOrWhiteSpace($PoseJson)){  $PoseJson  = PickPoseJson  $ShotDir }

if(-not (Test-Path -LiteralPath $ShotDir)){ throw "ShotDir not found: $ShotDir" }
if(-not (Test-Path -LiteralPath $OutDir)){ New-Item -ItemType Directory -Path $OutDir | Out-Null }

if([string]::IsNullOrWhiteSpace($ShaftJson) -or -not (Test-Path -LiteralPath $ShaftJson)){
  throw "ShaftJson not found. Pass -ShaftJson explicitly."
}
if([string]::IsNullOrWhiteSpace($PoseJson) -or -not (Test-Path -LiteralPath $PoseJson)){
  throw "PoseJson not found. Pass -PoseJson explicitly."
}

$shaft = ReadJson $ShaftJson
$pose  = ReadJson $PoseJson

Write-Host ("Using ShaftJson: " + $ShaftJson) -ForegroundColor Cyan
Write-Host ("Using PoseJson : " + $PoseJson) -ForegroundColor Cyan

# map phases from shaft json array
$map = @{}
foreach($it in @($shaft)){
  try{
    $ph = NormPhase ([string]$it.phase)
    if([string]::IsNullOrWhiteSpace($ph)){ continue }
    $map[$ph] = $it
  } catch {}
}

function PhaseBlock([string]$ph){
  if(-not $map.ContainsKey($ph)){ return $null }
  $it = $map[$ph]
  $frame = [int]("$($it.frame)")
  $armDeg = GetArmDegFromPose $pose $frame

  $source = ""
  try{ $source = [string]$it.shaft.source } catch {}

  $conf = 0
  try{
    if($null -ne $it.shaft.confidenceRaw){ $conf = [int]("$($it.shaft.confidenceRaw)") }
  } catch { $conf = 0 }

  $shaftDeg = $null
  try{
    if($source -ne "unavailable" -and $conf -gt 0 -and $null -ne $it.shaft.angleDeg){
      $shaftDeg = [double]$it.shaft.angleDeg
    }
  } catch { $shaftDeg = $null }

  $stack = $null
  if($null -ne $shaftDeg -and $null -ne $armDeg){
    $stack = StackDeg ([double]$shaftDeg) ([double]$armDeg)
  }

  $line = $null
  $imageSize = $null
  try{
    if($null -ne $shaftDeg){
      $line = $it.shaft.vision.line
      $imageSize = $it.shaft.vision.imageSize
    }
  } catch {}

  return [pscustomobject]@{
    phase       = $ph
    frame       = $frame
    armDeg      = $armDeg
    shaftDeg    = $shaftDeg
    stackDeg    = $stack
    conf        = $conf
    shaftSource = $source
    shaftLine   = $line
    imageSize   = $imageSize
    why         = [string]$it.shaft.why
  }
}

$p5 = PhaseBlock "P5"
$p6 = PhaseBlock "P6"
$p7 = PhaseBlock "P7"

$confList = @()
foreach($p in @($p5,$p6,$p7)){
  if($null -ne $p -and $p.conf -is [int]){ $confList += $p.conf }
}
$confidenceMin = if($confList.Count -gt 0){ ($confList | Measure-Object -Minimum).Minimum } else { $null }

$allExist = ($null -ne $p5 -and $null -ne $p6 -and $null -ne $p7)
$allArm   = ($allExist -and $null -ne $p5.armDeg -and $null -ne $p6.armDeg -and $null -ne $p7.armDeg)
$allShaft = ($allExist -and $null -ne $p5.shaftDeg -and $null -ne $p6.shaftDeg -and $null -ne $p7.shaftDeg)

$status = if($allArm -and $allShaft){
  if($confidenceMin -ge 25){ "ok" } else { "low_confidence" }
} else { "missing" }

$releaseCliff = $null
$finishDrop   = $null
if($null -ne $p5.stackDeg -and $null -ne $p6.stackDeg){ $releaseCliff = [double]$p6.stackDeg - [double]$p5.stackDeg }
if($null -ne $p6.stackDeg -and $null -ne $p7.stackDeg){ $finishDrop   = [double]$p7.stackDeg - [double]$p6.stackDeg }

$payload = [pscustomobject]@{
  ok            = $true
  status        = $status
  confidenceMin = $confidenceMin
  meta = @{
    created = (Get-Date).ToString("s")
    shotDir = $ShotDir
    shaftJson = $ShaftJson
    poseJson  = $PoseJson
    note = "Shaft-vs-left-arm angle (P5/P6/P7). armDeg uses left_shoulder(11)->left_wrist(15)."
  }
  P5 = $p5
  P6 = $p6
  P7 = $p7
  metrics = @{
    releaseCliff = $releaseCliff
    finishDrop   = $finishDrop
  }
}

$outPath = Join-Path $OutDir "P5_P6_P7_ShaftArm.json"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outPath, ($payload | ConvertTo-Json -Depth 40), $utf8NoBom)

Write-Host ("Created: " + $outPath) -ForegroundColor Green
if($VerboseDebug){
  Write-Host ("status=" + $status + " confidenceMin=" + $confidenceMin) -ForegroundColor Yellow
  Write-Host ("P5 arm=" + $p5.armDeg + " stack=" + $p5.stackDeg) -ForegroundColor Cyan
  Write-Host ("P6 arm=" + $p6.armDeg + " stack=" + $p6.stackDeg) -ForegroundColor Cyan
  Write-Host ("P7 arm=" + $p7.armDeg + " stack=" + $p7.stackDeg) -ForegroundColor Cyan
  Write-Host ("releaseCliff=" + $releaseCliff + "  finishDrop=" + $finishDrop) -ForegroundColor Cyan
}