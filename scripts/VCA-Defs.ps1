Set-StrictMode -Version Latest

function Get-VcaDefsRoot {
  param([string]$Root = "C:\Sites\virtual-coach-ai")
  $d = Join-Path $Root "_defs"
  if(-not (Test-Path $d)){ throw "Missing defs folder: $d" }
  return $d
}

function Read-Json {
  param([string]$Path)
  if(-not (Test-Path $Path)){ throw "Missing JSON: $Path" }
  return (Get-Content $Path -Raw | ConvertFrom-Json)
}

function Get-VcaDefs {
  param([string]$Root = "C:\Sites\virtual-coach-ai")
  $d = Get-VcaDefsRoot -Root $Root
  [pscustomobject]@{
    definitions = Read-Json (Join-Path $d "VCA_MEASUREMENT_DEFINITIONS.json")
    names       = Read-Json (Join-Path $d "VCA_METRIC_NAMES.json")
    guardrails  = Read-Json (Join-Path $d "VCA_COACHING_GUARDRAILS.json")
  }
}

function Test-VcaMetricObject {
  param(
    [Parameter(Mandatory)] $Obj,
    [string]$PathLabel = "metric"
  )
  # Require "source" + some kind of confidence field for any metric object
  $props = $Obj.PSObject.Properties.Name
  if($props -notcontains "source"){ throw "❌ Missing .source on $PathLabel" }

  $hasConf = ($props -contains "confidence") -or ($props -contains "confidenceRaw") -or ($props -contains "confidenceStable")
  if(-not $hasConf){ throw "❌ Missing confidence (confidence/confidenceRaw/confidenceStable) on $PathLabel" }
}

function Test-VcaReadyBundle {
  param(
    [Parameter(Mandatory)] $Bundle,
    [string]$Label = "bundle"
  )

  foreach($k in @("meta","toggles","alignment","shaft","xfactor")){
    if(-not ($Bundle.PSObject.Properties.Name -contains $k)){
      throw "❌ $Label missing key: $k"
    }
  }

  Test-VcaMetricObject -Obj $Bundle.alignment -PathLabel "$Label.alignment"
  Test-VcaMetricObject -Obj $Bundle.shaft     -PathLabel "$Label.shaft"
  Test-VcaMetricObject -Obj $Bundle.xfactor   -PathLabel "$Label.xfactor"
}

Export-ModuleMember -Function Get-VcaDefs, Test-VcaMetricObject, Test-VcaReadyBundle