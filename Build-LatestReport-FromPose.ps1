param(
  [Parameter(Mandatory=$true)]
  [string]$PoseJson,

  [string]$OutJson = "C:\Sites\virtual-coach-ai\public\data\latest-report.json"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $PoseJson)) { throw "Pose JSON not found: $PoseJson" }

# Load pose json (best effort)
$poseRaw = Get-Content -Path $PoseJson -Raw
$pose = $null
try { $pose = $poseRaw | ConvertFrom-Json -Depth 200 } catch { throw "Pose JSON failed to parse: $PoseJson" }

# Try to discover frames/landmarks array in a few common shapes
$frames = $null

# Common: { frames: [...] }
if ($pose.frames -and $pose.frames.Count -gt 0) { $frames = $pose.frames }

# Common: { data: { frames: [...] } }
if (-not $frames -and $pose.data -and $pose.data.frames -and $pose.data.frames.Count -gt 0) { $frames = $pose.data.frames }

# Common: array root [...]
if (-not $frames -and ($pose -is [System.Collections.IEnumerable]) -and ($pose.Count -gt 0)) { $frames = $pose }

# If still nothing, try: { landmarks: [...] } meaning per-frame landmarks
if (-not $frames -and $pose.landmarks -and $pose.landmarks.Count -gt 0) { $frames = $pose.landmarks }

if (-not $frames -or $frames.Count -lt 2) {
  Write-Host "⚠️ Could not confidently detect frames array. We'll still build a report using fallback pchecks." -ForegroundColor Yellow
  $frameCount = 0
} else {
  $frameCount = [int]$frames.Count
}

# Pick 9 indices evenly spaced across available frames
function Pick-Indices([int]$Count){
  if ($Count -lt 9) {
    # If too few frames, just use 0..Count-1 then pad with last
    $idx = New-Object System.Collections.Generic.List[int]
    for($i=0;$i -lt $Count;$i++){ $idx.Add($i) | Out-Null }
    while($idx.Count -lt 9){ $idx.Add([Math]::Max(0,$Count-1)) | Out-Null }
    return $idx.ToArray()
  }
  $out = New-Object System.Collections.Generic.List[int]
  for ($k=0; $k -lt 9; $k++){
    $t = $k / 8.0
    $i = [int][Math]::Round($t * ($Count-1))
    $out.Add($i) | Out-Null
  }
  return $out.ToArray()
}

$idxs = if ($frameCount -gt 0) { Pick-Indices $frameCount } else { @(0,0,0,0,0,0,0,0,0) }

# P1-P9 titles (your locked naming)
$titles = @(
  "Setup",
  "Shaft parallel backswing",
  "Lead arm parallel backswing",
  "Top of swing",
  "Lead arm parallel downswing",
  "Shaft parallel downswing",
  "Impact",
  "Trail arm parallel follow-through",
  "Finish"
)

# Build pchecks (guarantee arrays exist)
$pchecks = @()
for ($p=1; $p -le 9; $p++){
  $pchecks += [pscustomobject]@{
    p = $p
    title = $titles[$p-1]
    coachNotes = @("Demo mode: pose frames detected. This checkpoint is wired and stable.")
    commonMisses = @("Demo mode: fault logic will refine once phase detection + scoring is finalized.")
    drills = @("Demo mode: drill engine will replace these with personalized prescriptions.")
    meta = [pscustomobject]@{
      poseFrameIndex = $idxs[$p-1]
      poseFramesTotal = $frameCount
      poseSource = (Split-Path $PoseJson -Leaf)
    }
  }
}

# Try to load your existing demo card data as a base (keeps the pretty top panels)
$baseCard = "C:\Sites\virtual-coach-ai\public\data\card-demo.json"
$base = $null
if (Test-Path $baseCard) {
  try { $base = (Get-Content $baseCard -Raw | ConvertFrom-Json -Depth 200) } catch { $base = $null }
}

# Build report object using base where possible
$now = Get-Date
$player = if ($base -and $base.playerName) { $base.playerName } else { "Player (real swing demo)" }

$report = [ordered]@{
  playerName = $player
  generatedAt = $now.ToString("s")
  overview = if ($base -and $base.overview) { $base.overview } else { "Real swing demo: pose data loaded and report rendering end-to-end." }
  highlights = if ($base -and $base.highlights) { $base.highlights } else { @("Pose JSON loaded", "Report render stable", "Next: fault scoring + phase detection") }
  doingWell = if ($base -and $base.doingWell) { $base.doingWell } else { @("Upload-to-report pipeline is alive.") }
  leaks = if ($base -and $base.leaks) { $base.leaks } else { @("Scoring logic pending refinement.") }
  topFixes = if ($base -and $base.topFixes) { $base.topFixes } else { @("Stabilize phases", "Score 2 faults", "Prescribe 2 drills") }
  swingScore = if ($base -and $base.swingScore) { $base.swingScore } else { 84 }
  tourDna = if ($base -and $base.tourDna) { $base.tourDna } else { "Tour DNA Match: Player R (demo)" }
  priority = if ($base -and $base.priority) { $base.priority } else { "Face control + pressure shift" }
  grades = if ($base -and $base.grades) { $base.grades } else { @{ power="B+"; speed="B"; efficiency="B+"; consistency="A-" } }
  faults = if ($base -and $base.faults) { $base.faults } else { @(
      @{ title="Demo fault 1"; why="Scoring engine placeholder."; fix="Next step: deterministic fault rules from pose." ; severity="needs" },
      @{ title="Demo fault 2"; why="Scoring engine placeholder."; fix="Next step: drill prescription from fault tags." ; severity="needs" }
    )
  }
  drills = if ($base -and $base.drills) { $base.drills } else { @(
      @{ name="Demo drill 1"; steps=@("Placeholder step 1","Placeholder step 2"); reps="2x10" },
      @{ name="Demo drill 2"; steps=@("Placeholder step 1","Placeholder step 2"); reps="2x10" }
    )
  }
  pchecks = $pchecks
  practicePlan = if ($base -and $base.practicePlan) { $base.practicePlan } else { @{
    title="14-Day Practice Plan"
    subtitle="Demo mode: pipeline validated. Next: scoring + prescriptions."
    bullets=@("Days 1–3: stabilize upload + pose + report","Days 4–7: deterministic faults","Days 8–14: drill prescriptions + voice summary")
  } }
}

# Ensure output folder
$outDir = Split-Path $OutJson -Parent
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# Write JSON
$reportJson = $report | ConvertTo-Json -Depth 200
Set-Content -Path $OutJson -Value $reportJson -Encoding UTF8

Write-Host "✅ Wrote: $OutJson" -ForegroundColor Green
Write-Host ("Pose frames detected: {0}" -f $frameCount) -ForegroundColor DarkGray
Write-Host "Next: open /report-beta/full?src=/data/latest-report.json" -ForegroundColor Cyan
