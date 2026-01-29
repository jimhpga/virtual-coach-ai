param(
  [string]$File = ".\app\api\analyze-swing\route.ts",
  [int]$MinBytes = 5000
)

if(!(Test-Path $File)){
  Write-Host "MISSING: $File" -ForegroundColor Red
  exit 2
}

$len = (Get-Item $File).Length
if($len -lt $MinBytes){
  Write-Host "FAIL: $File is $len bytes (< $MinBytes). Possible accidental overwrite." -ForegroundColor Red
  exit 1
}

Write-Host "PASS: $File is $len bytes" -ForegroundColor Green
exit 0

