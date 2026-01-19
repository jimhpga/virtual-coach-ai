param(
  [Parameter(Mandatory=$true)][string]$InDir,
  [Parameter(Mandatory=$true)][string]$OutDir,
  [ValidateSet("right","left")][string]$Handedness = "right",
  [ValidateSet("right","left")][string]$EyeDominance = "right",
  [double]$Fps = 60,
  [double]$WinStart = 0.10,
  [double]$WinEnd   = 0.60
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Web.Extensions | Out-Null
$ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$ser.MaxJsonLength = 2147483647

function Num($v) { try { [double]$v } catch { [double]::NaN } }

function WrapDeg([double]$a) {
  while ($a -ge 180) { $a -= 360 }
  
function AxisAngle180([double]$a) {
  # undirected line orientation in degrees: 0..180
  $w = WrapDeg $a
  if ($w -lt 0) { $w += 180 }
  if ($w -ge 180) { $w -= 180 }
  return $w
}
function SepAxis([double]$a, [double]$b) {
  # smallest separation between two undirected axes in degrees: 0..90
  $aa = AxisAngle180 $a
  $bb = AxisAngle180 $b
  $d = [math]::Abs($aa - $bb)
  if ($d -gt 90) { $d = 180 - $d }
  return $d
}
while ($a -lt -180) { $a += 360 }
  return $a
}
function DeltaDeg([double]$a, [double]$b) { return (WrapDeg ($a - $b)) }

function UnwrapAngles([double[]]$arr) {
  if (-not $arr -or $arr.Count -lt 2) { return ,$arr }
  $out = New-Object System.Collections.Generic.List[double]
  $out.Add($arr[0]) | Out-Null
  $acc = $arr[0]
  for ($i=1; $i -lt $arr.Count; $i++) {
    $d = DeltaDeg $arr[$i] $arr[$i-1]
    $acc = $acc + $d
    $out.Add($acc) | Out-Null
  }
  return ,($out.ToArray())
}

function RangeAbs([double[]]$arr) {
  if (-not $arr -or $arr.Count -lt 2) { return [double]::NaN }
  $mn = ($arr | Measure-Object -Minimum).Minimum
  $mx = ($arr | Measure-Object -Maximum).Maximum
  return [math]::Abs($mx - $mn)
}

function PeakAbs([double[]]$arr) {
  if (-not $arr -or $arr.Count -lt 1) { return [double]::NaN }
  return ($arr | Sort-Object { [math]::Abs($_) } -Descending | Select-Object -First 1)
}

function MovingAvg([double[]]$arr, [int]$k) {
  if (-not $arr -or $arr.Count -lt 1) { return ,$arr }
  if ($k -lt 2) { return ,$arr }
  $n = $arr.Count
  $out = New-Object double[] $n
  $half = [math]::Floor($k/2)
  for ($i=0; $i -lt $n; $i++) {
    $a = [math]::Max(0, $i - $half)
    $b = [math]::Min($n-1, $i + $half)
    $sum = 0.0; $cnt = 0
    for ($j=$a; $j -le $b; $j++) { $sum += $arr[$j]; $cnt++ }
    $out[$i] = $sum / [math]::Max(1,$cnt)
  }
  return ,$out
}

function Get-Any($obj, [string[]]$keys) {
  if ($null -eq $obj) { return $null }

  if ($obj -is [System.Collections.IDictionary]) {
    foreach ($k in $keys) {
      try { if ($obj.ContainsKey($k)) { return $obj[$k] } } catch {}
      try { if ($obj.Contains($k))    { return $obj[$k] } } catch {}
      try { $v = $obj[$k]; if ($null -ne $v) { return $v } } catch {}
    }
    return $null
  }

  foreach ($k in $keys) {
    $p = $obj.PSObject.Properties[$k]
    if ($null -ne $p) { return $p.Value }
  }
  return $null
}

function Get-Frames($root) {
  $f = Get-Any $root @("frames")
  if ($f) { return $f }
  $media = Get-Any $root @("media")
  $mf = Get-Any $media @("frames")
  if ($mf) { return $mf }
  if ($root -is [System.Collections.IEnumerable] -and $root -isnot [string]) { return $root }
  return $null
}

function Get-Landmarks($frame) {
  $lm = Get-Any $frame @("pose_landmarks","poseLandmarks","landmarks","poseWorldLandmarks","world_landmarks")
  if (-not $lm) { return $null }
  $wrapped = Get-Any $lm @("landmark")
  if ($wrapped) { $lm = $wrapped }
  if ($lm -isnot [System.Collections.IEnumerable]) { return $null }
  return ,$lm
}

function AngleDeg2D($ax,$ay,$bx,$by) {
  return [math]::Atan2(($by-$ay), ($bx-$ax)) * 180.0 / [math]::PI
}

function MidPt($a,$b) {
  if (-not $a -or -not $b) { return $null }
  $ax = Num (Get-Any $a @("x")); $ay = Num (Get-Any $a @("y"))
  $bx = Num (Get-Any $b @("x")); $by = Num (Get-Any $b @("y"))
  if ([double]::IsNaN($ax) -or [double]::IsNaN($bx)) { return $null }
  return @{ x = (($ax+$bx)/2); y = (($ay+$by)/2) }
}

function LineAngleDeg($a,$b) {
  if (-not $a -or -not $b) { return [double]::NaN }
  $ax = Num (Get-Any $a @("x")); $ay = Num (Get-Any $a @("y"))
  $bx = Num (Get-Any $b @("x")); $by = Num (Get-Any $b @("y"))
  if ([double]::IsNaN($ax) -or [double]::IsNaN($bx)) { return [double]::NaN }
  return (AngleDeg2D $ax $ay $bx $by)
}

# MediaPipe Pose indices
$NOSE  = 0
$L_EAR = 7
$R_EAR = 8
$L_SH  = 11
$R_SH  = 12
$L_EL  = 13
$R_EL  = 14
$L_HIP = 23
$R_HIP = 24

function HeadYawDeg($lm) {
  $nose = $lm[$NOSE]; $le = $lm[$L_EAR]; $re = $lm[$R_EAR]
  if (-not $nose -or -not $le -or -not $re) { return [double]::NaN }
  $nx = Num (Get-Any $nose @("x")); $ny = Num (Get-Any $nose @("y"))
  $lx = Num (Get-Any $le   @("x")); $ly = Num (Get-Any $le   @("y"))
  $rx = Num (Get-Any $re   @("x")); $ry = Num (Get-Any $re   @("y"))
  if ([double]::IsNaN($nx) -or [double]::IsNaN($lx) -or [double]::IsNaN($rx)) { return [double]::NaN }
  $mx = ($lx + $rx)/2
  $my = ($ly + $ry)/2
  return (AngleDeg2D $mx $my $nx $ny)
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$rows = @()
$files = Get-ChildItem -LiteralPath $InDir -File -Filter "*.json" | Sort-Object -Property FullName

foreach ($file in $files) {
  try {
    $root = $ser.DeserializeObject((Get-Content -LiteralPath $file.FullName -Raw))
    $frames = Get-Frames $root
    if (-not $frames) { throw "No frames found" }

    $yaw   = New-Object System.Collections.Generic.List[double]
    $shAng = New-Object System.Collections.Generic.List[double]
    $hipAng= New-Object System.Collections.Generic.List[double]

    # Scap proxy lists (2D): arm line angle relative to shoulder line
    $scapTrail = New-Object System.Collections.Generic.List[double]
    $scapLead  = New-Object System.Collections.Generic.List[double]

    foreach ($fr in $frames) {
      $lm = Get-Landmarks $fr
      if (-not $lm) { continue }

      $y = HeadYawDeg $lm
      if (-not [double]::IsNaN($y)) { $yaw.Add($y) | Out-Null }

      $ls = $lm[$L_SH]; $rs = $lm[$R_SH]
      $lh = $lm[$L_HIP]; $rh = $lm[$R_HIP]
      $le = $lm[$L_EL];  $re = $lm[$R_EL]

      if ($ls -and $rs) {
        $sa = LineAngleDeg $ls $rs
        if (-not [double]::IsNaN($sa)) { $shAng.Add($sa) | Out-Null }

        if ($rs -and $re -and -not [double]::IsNaN($sa)) {
          $ar = LineAngleDeg $rs $re
          if (-not [double]::IsNaN($ar)) { $scapTrail.Add( (WrapDeg ($ar - $sa)) ) | Out-Null }
        }
        if ($ls -and $le -and -not [double]::IsNaN($sa)) {
          $al = LineAngleDeg $ls $le
          if (-not [double]::IsNaN($al)) { $scapLead.Add( (WrapDeg ($al - $sa)) ) | Out-Null }
        }
      }

      if ($lh -and $rh) {
        $ha = LineAngleDeg $lh $rh
        if (-not [double]::IsNaN($ha)) { $hipAng.Add($ha) | Out-Null }
      }
    }

    if ($yaw.Count -lt 12 -or $shAng.Count -lt 12 -or $hipAng.Count -lt 12) { throw "Too few valid frames" }

    $type = if ($Handedness -eq $EyeDominance) { "TypeI" } else { "TypeII" }

    # Head yaw deltas vs first valid yaw
    $yawArr = $yaw.ToArray()
    $yawBase = $yawArr[0]
    $headYawImpact = DeltaDeg $yawArr[$yawArr.Count-1] $yawBase

    $n = $yawArr.Count
    $i0 = [math]::Max(0, [math]::Floor($n * $WinStart))
    $i1 = [math]::Min($n-1, [math]::Floor($n * $WinEnd))
    if ($i1 -le $i0) { $i0 = 0; $i1 = [math]::Max(5, [math]::Floor($n*0.60)) }

    $yawWin = $yawArr[$i0..$i1]
    $headYawTopRaw = ($yawWin | Sort-Object { [math]::Abs((DeltaDeg $_ $yawBase)) } -Descending | Select-Object -First 1)
    $headYawTop = DeltaDeg $headYawTopRaw $yawBase

    # ===== X-Factor proxy (stable): sep(t)=Wrap(shoulder-hip), then unwrap sep(t) =====
    $sa = $shAng.ToArray()
    $ha = $hipAng.ToArray()
    $m = [math]::Min($sa.Count, $ha.Count)
    $sep = New-Object double[] $m
    for ($i=0; $i -lt $m; $i++) { $sep[$i] = SepAxis $sa[$i] $ha[$i] }
    $sepU = UnwrapAngles $sep

    $j0 = [math]::Max(0, [math]::Floor($m * $WinStart))
    $j1 = [math]::Min($m-1, [math]::Floor($m * $WinEnd))
    if ($j1 -le $j0) { $j0 = 0; $j1 = [math]::Max(5, [math]::Floor($m*0.60)) }

    $seg = $sepU[$j0..$j1]
    $xFactorRange = RangeAbs $seg
    $xFactorPeak  = PeakAbs  $seg

    # X-Factor velocity (deg/sec)
    $fps = [math]::Max(1.0, $Fps)
    $vel = New-Object double[] $seg.Count
    $vel[0] = 0
    for ($i=1; $i -lt $seg.Count; $i++) { $vel[$i] = ($seg[$i] - $seg[$i-1]) * $fps }
    $velS = MovingAvg $vel 5
    $xFactorPeakVel = PeakAbs $velS

    # ===== Scap ranges (stable): unwrap scap(t) and take windowed range =====
    $scapTrailRange = [double]::NaN
    $scapLeadRange  = [double]::NaN

    if ($scapTrail.Count -gt 10) {
      $st = UnwrapAngles ($scapTrail.ToArray())
      $mm = $st.Count
      $k0 = [math]::Max(0, [math]::Floor($mm * $WinStart))
      $k1 = [math]::Min($mm-1, [math]::Floor($mm * $WinEnd))
      if ($k1 -le $k0) { $k0 = 0; $k1 = [math]::Max(5, [math]::Floor($mm*0.60)) }
      $scapTrailRange = RangeAbs ($st[$k0..$k1])
    }
    if ($scapLead.Count -gt 10) {
      $sl = UnwrapAngles ($scapLead.ToArray())
      $mm = $sl.Count
      $k0 = [math]::Max(0, [math]::Floor($mm * $WinStart))
      $k1 = [math]::Min($mm-1, [math]::Floor($mm * $WinEnd))
      if ($k1 -le $k0) { $k0 = 0; $k1 = [math]::Max(5, [math]::Floor($mm*0.60)) }
      $scapLeadRange = RangeAbs ($sl[$k0..$k1])
    }

    # Scap share (simple ratio using trail scap)
    $eps = 0.0001
    $scapShare = $null
    if (-not [double]::IsNaN($xFactorRange) -and -not [double]::IsNaN($scapTrailRange)) {
      $scapShare = [math]::Round( ( [math]::Abs($scapTrailRange) / ([math]::Abs($xFactorRange) + [math]::Abs($scapTrailRange) + $eps) ) * 100, 1 )
    }

    # VSI (simple placeholder): penalize low head clearance + excessive X-Factor range
    $noseMin = if ($type -eq "TypeI") { 15 } else { 5 }
    $xTol    = if ($type -eq "TypeI") { 65 } else { 85 }
    $penNose = if ([math]::Abs($headYawImpact) -lt $noseMin) { ($noseMin - [math]::Abs($headYawImpact)) } else { 0 }
    $penX    = if ([double]::IsNaN($xFactorRange)) { 0 } else { [math]::Max(0, $xFactorRange - $xTol) }
    $VSI = [math]::Round(($penNose + $penX), 2)

    $rows += [pscustomobject]@{
      clip = $file.Name
      type = $type
      VSI  = $VSI

      headYawImpactDeg = [math]::Round($headYawImpact,2)
      headYawTopDeg    = [math]::Round($headYawTop,2)

      xFactorRangeDeg          = if ([double]::IsNaN($xFactorRange))   { $null } else { [math]::Round($xFactorRange,2) }
      xFactorPeakDeg           = if ([double]::IsNaN($xFactorPeak))    { $null } else { [math]::Round($xFactorPeak,2) }
      xFactorPeakVelDegPerSec  = if ([double]::IsNaN($xFactorPeakVel)) { $null } else { [math]::Round($xFactorPeakVel,2) }

      scapTrailRangeDeg = if ([double]::IsNaN($scapTrailRange)) { $null } else { [math]::Round($scapTrailRange,2) }
      scapLeadRangeDeg  = if ([double]::IsNaN($scapLeadRange))  { $null } else { [math]::Round($scapLeadRange,2) }
      scapSharePct      = $scapShare

      fps        = $Fps
      windowStart= $WinStart
      windowEnd  = $WinEnd
    }

    Write-Host ("✅ " + $file.Name) -ForegroundColor Green
  }
  catch {
    Write-Host ("❌ " + $file.Name + " :: " + $_.Exception.Message) -ForegroundColor Red
  }
}

$csv = Join-Path $OutDir "vision_metrics.csv"
$json = Join-Path $OutDir "vision_metrics.json"
$rows | Export-Csv -NoTypeInformation -Encoding UTF8 $csv
$rows | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $json

Write-Host ""
Write-Host "=== OUTPUT ==="
Write-Host $csv
Write-Host $json

