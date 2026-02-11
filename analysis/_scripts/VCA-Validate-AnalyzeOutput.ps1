param(
  [string]$Url = "http://127.0.0.1:3000/api/analyze-swing",
  [string]$ContractPath = "C:\Sites\virtual-coach-ai\analysis\metric_contract.json",
  [switch]$Demo
)

$ErrorActionPreference = "Stop"

# --- load contract (best-effort) ---
$contract = $null
try{
  if(Test-Path $ContractPath){
    $contract = Get-Content $ContractPath -Raw | ConvertFrom-Json
  }
}catch{}

# --- call API ---
$bodyObj = @{}
if($Demo){ $bodyObj.demo = $true }
$bodyJson = ($bodyObj | ConvertTo-Json -Depth 6)

Write-Host ("▶ POST " + $Url + "  (demo=" + $Demo.IsPresent + ")") -ForegroundColor Cyan

try{
  $raw = Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body $bodyJson
}catch{
  Write-Host "❌ API call failed." -ForegroundColor Red
  throw
}

# Normalize to object ONCE
$j = $raw
if($raw -is [string]){ $j = $raw | ConvertFrom-Json }

# --- helpers (never throw on missing props) ---
function Get-Prop {
  param(
    [Parameter(Mandatory=$true)] $Obj,
    [Parameter(Mandatory=$true)] [string[]] $Names
  )
  foreach($n in $Names){
    if($null -eq $Obj){ continue }
    $p = $Obj.PSObject.Properties.Match($n)
    if($p.Count -gt 0){ return $p[0].Value }
  }
  return $null
}

function To-Camel([string]$s){
  $parts = $s -split "_"
  if($parts.Count -le 1){ return $s }
  $out = $parts[0]
  for($i=1; $i -lt $parts.Count; $i++){
    if($parts[$i].Length -gt 0){
      $out += ($parts[$i].Substring(0,1).ToUpper() + $parts[$i].Substring(1))
    }
  }
  return $out
}

$errs = New-Object System.Collections.Generic.List[string]
function Need([bool]$cond, [string]$msg){
  if(-not $cond){ [void]$errs.Add($msg) }
}

# --- alias map for required top-level outputs ---
$OUT_ALIASES = @{
  "ranked_faults" = @("ranked_faults","rankedFaults","faults","ranked")
  "swing_score"   = @("swing_score","swingScore","score")
  "practice_plan" = @("practice_plan","practicePlan","plan")
  "p_checkpoints" = @("p_checkpoints","pcheckpoints","pChecks","pchecks","p_checkpoints_tiles")
}

# --- required top-level outputs: property existence only ---
$requiredOutputs = @()
if($null -ne $contract -and $null -ne $contract.outputs){
  $requiredOutputs = @($contract.outputs)
}else{
  $requiredOutputs = @("ranked_faults","swing_score","practice_plan","p_checkpoints")
}

foreach($k in $requiredOutputs){
  $names = @($k)
  if($OUT_ALIASES.ContainsKey($k)){ $names = @($OUT_ALIASES[$k]) }
  $present = (@($names | Where-Object { $j.PSObject.Properties.Name -contains $_ }).Count -ge 1)
  Need $present ("Missing top-level output: " + $k + " (tried: " + ($names -join ", ") + ")")
}

# --- checkpoints minimal presence (don’t over-police shape here) ---
$pc = Get-Prop -Obj $j -Names $OUT_ALIASES["p_checkpoints"]
Need ($null -ne $pc) "p_checkpoints missing (after alias resolution)"

# --- ranked_faults shape (only enforce non-empty when ok != true) ---
$ok = Get-Prop -Obj $j -Names @("ok")
$rf = Get-Prop -Obj $j -Names $OUT_ALIASES["ranked_faults"]

if($null -ne $rf){
  $rfCount = @($rf).Count
  if(-not ($ok -eq $true)){
    Need ($rfCount -ge 1) "ranked_faults is empty"
  }
  if($rfCount -ge 1){
    $f0 = @($rf)[0]
    $k0 = Get-Prop -Obj $f0 -Names @("key","label","title")
    Need ($null -ne $k0) "ranked_faults[0] lacks key/label/title"
  }
}

# --- metrics presence (contract.metrics list) ---
$metricNames = @()
if($null -ne $contract -and $null -ne $contract.metrics){
  $metricNames = @($contract.metrics)
}else{
  # fallback: the known MVP list
  $metricNames = @(
    "tempo_ratio",
    "backswing_time_ms",
    "downswing_time_ms",
    "pelvis_rotation_p7",
    "torso_rotation_p7",
    "x_factor_proxy",
    "spine_tilt_p7",
    "side_bend_p7",
    "lead_arm_angle_p6",
    "handle_height_p7",
    "hip_drift_total",
    "center_mass_shift"
  )
}

$metricsObj = Get-Prop -Obj $j -Names @("metrics")
foreach($m in $metricNames){
  $mNames = @($m, (To-Camel $m))
  $mv = $null
  if($null -ne $metricsObj){ $mv = Get-Prop -Obj $metricsObj -Names $mNames }
  $tv = Get-Prop -Obj $j -Names $mNames
  Need (($mv -ne $null) -or ($tv -ne $null)) ("Missing metric: " + $m + " (expected at metrics." + $m + " or top-level)")
}

if($errs.Count -gt 0){
  Write-Host "❌ VALIDATION FAILED" -ForegroundColor Red
  $errs | ForEach-Object { Write-Host (" - " + $_) -ForegroundColor Red }
  exit 2
}

# Summary
$ss = Get-Prop -Obj $j -Names @("swing_score","swingScore","score")
$rf2 = Get-Prop -Obj $j -Names $OUT_ALIASES["ranked_faults"]
$rfCount2 = if($null -ne $rf2){ @($rf2).Count } else { 0 }

Write-Host "✅ VALIDATION OK" -ForegroundColor Green
Write-Host ("  swing_score=" + $ss) -ForegroundColor Green
Write-Host ("  faults=" + $rfCount2) -ForegroundColor Green
