$newURL = "https://virtual-coach-93kc7yl50-jimhs-projects-3730d8f7.vercel.app"
$body = @{ uploadId="demo-123"; activePhase="P5" } | ConvertTo-Json
$r = Invoke-WebRequest -Method Post -Uri "$newURL/api/pose-estimate" -ContentType "application/json" -Body $body -UseBasicParsing
"STATUS: $($r.StatusCode)"
"CONTENT-TYPE: $($r.Headers['Content-Type'])"
"X-MATCHED-PATH: $($r.Headers['x-matched-path'])"
"FIRST-120:`n$($r.Content.Substring(0,[Math]::Min(120, $r.Content.Length)))"
$img = Invoke-WebRequest -Uri "$newURL/pose-demo.jpg" -UseBasicParsing
"POSE-DEMO STATUS: $($img.StatusCode)"
