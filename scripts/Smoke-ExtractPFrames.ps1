$base="http://localhost:3000"
$videoUrl="/uploads/1767545829462-VCA_Impact_Hero_candidate3.mp4"
$r = Invoke-WebRequest "$base/api/extract-pframes" -Method Post -ContentType "application/json" `
  -Body (@{ videoUrl=$videoUrl; impactFrame=62 } | ConvertTo-Json) -TimeoutSec 30 -UseBasicParsing
$j = $r.Content | ConvertFrom-Json
"OK: $($j.ok)  ms=$($j.ms)  framesDir=$($j.framesDir)"
"P7 frame = " + (($j.frames | Where-Object p -eq 7).frame)
$img="$base$($j.framesDir)/p7.jpg"
"Try opening: $img"
