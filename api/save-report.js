# ---- Create a rich report body ----
$body = @{
  status       = "ready"
  swingScore   = 82
  muxPlaybackId = $null
  muxUploadId  = "smoke"

  # P1–P9 (you can add up to 9)
  phases = @(
    @{ id="P1"; name="Address";  grade="ok";  short="Athletic, neutral"; long="Balanced stance, soft knees, chin up."; ref="https://www.youtube.com/watch?v=6w2eFiHmpiA" }
    @{ id="P2"; name="Takeaway"; grade="good";short="One-piece start";  long="Clubhead outside hands, shaft parallel to target line."; ref="https://youtu.be/GW4Jm66p3y8" }
    @{ id="P3"; name="Lead arm parallel"; grade="ok"; short="Width kept"; long="Lead arm extended, trail wrist hinged, club in plane window."; ref="lead arm parallel golf drill" }
    @{ id="P4"; name="Top"; grade="needs help"; short="Across line"; long="Slight across; feel more laid off with lead wrist flat."; ref="top of backswing laid off drill" }
  )

  coaching = @{
    priority_fixes = @(
      @{ title="Flatten lead wrist at top"; short="Bow the lead wrist"; long="Train flexion at P4 to square face earlier."; ref="lead wrist flexion golf drill" }
      @{ title="Later trail-heel release"; short="Keep pressure longer"; long="Hold ground pressure to P5 for better sequence."; ref="ground reaction forces drill golf" }
      @{ title="Face-to-path control"; short="Start shots left of target"; long="Feel face slightly closed to path through P7."; ref="close face to path golf" }
    )
    power_fixes = @(
      @{ title="Pump step for GRF"; short="Mini step into lead side"; long="Add vertical force right before impact."; ref="step drill golf speed" }
      @{ title="3:1 tempo metronome"; short="Count 1-2-3 back, 1 through"; long="Consistency breeds speed."; ref="golf tempo 3 to 1 metronome" }
      @{ title="Early wrist set"; short="Set by P2.5"; long="Stores lever length without overrun."; ref="early wrist set drill golf" }
    )
  }

  position_metrics = @(
    @{ label="Spine tilt";         value=72 }
    @{ label="Hip hinge";          value=64 }
    @{ label="Ball position";      value=58 }
    @{ label="Grip fundamentals";  value=83 }
  )

  swing_metrics = @(
    @{ label="Club path control";  value=61 }
    @{ label="Face control";       value=69 }
    @{ label="Low-point control";  value=66 }
    @{ label="Start line";         value=62 }
  )

  power = @{ score=76; tempo="3:1"; release_timing=62 }

  practice_plan = @(
    @{ day=1;  title="Mirror P1–P2 (10m)";  items=@("Athletic posture checkpoints","One-piece takeaway with stick") }
    @{ day=2;  title="Tempo & Pump step";    items=@("Metronome 3:1 — 5m","Pump step drill — 10 reps") }
    @{ day=3;  title="Lead wrist at P4";     items=@("Bow lead wrist at top — 15 reps","Record 3 swings") }
    @{ day=4;  title="Low-point gates";      items=@("Impact line — 20 brush strikes","3 slow-motion swings") }
    @{ day=5;  title="Path & start line";    items=@("Alignment stick start line — 15 balls") }
    @{ day=6;  title="Speed windows";        items=@("Light–medium–full windows — 15 balls") }
    @{ day=7;  title="Review + light day";   items=@("Re-record P1–P4 checkpoints") }
    @{ day=8;  title="Re-load wrist set";    items=@("Set by P2.5 — 15 reps") }
    @{ day=9;  title="Face-to-path";         items=@("Start left, curve back — 10 balls") }
    @{ day=10; title="Ground forces";        items=@("Hold trail heel, post into lead — 10 reps") }
    @{ day=11; title="Tempo 3:1";            items=@("Metronome — 5 min") }
    @{ day=12; title="Pressure shift";       items=@("Step-change — 10 reps") }
    @{ day=13; title="Combine";              items=@("Alternate drills — 20 balls") }
    @{ day=14; title="Retest";               items=@("Film 3 swings — upload new report") }
  )

  meta = @{
    name   = "Jim Hartnett"
    email  = "jim@example.com"
    hcap   = "8"
    handed = "right"
    eye    = "right"
    height = 70
  }
}

# ---- Post it to your API ----
$json = $body | ConvertTo-Json -Depth 10
$resp = Invoke-RestMethod -Method POST `
  -Uri "https://virtualcoachai.net/api/save-report" `
  -Body $json -ContentType "application/json"

# ---- Open the viewer with the direct Blob URL (best), fallback to id ----
if ($resp.url) {
  $enc = [uri]::EscapeDataString($resp.url)
  Start-Process "https://virtualcoachai.net/report.html?url=$enc"
} else {
  Start-Process "https://virtualcoachai.net/report.html?id=$($resp.id)"
}

$resp
