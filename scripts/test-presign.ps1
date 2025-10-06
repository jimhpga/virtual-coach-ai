Param(
  [string]$Filename = "test.mov",
  [string]$Mime = "video/quicktime"
)

$Body = @{ filename = $Filename; type = $Mime; size = 1024 } | ConvertTo-Json

try {
  $res = Invoke-RestMethod -Method Post -Uri "https://virtualcoachai.net/api/presign" -ContentType "application/json" -Body $Body
  $res | Format-List *
} catch {
  Write-Host "Presign POST failed:" -ForegroundColor Red
  Write-Host $_
  exit 1
}

# Optional S3 upload (uncomment to actually upload a tiny dummy file)
# $tmp = "$env:TEMP\dummy.mov"; Set-Content -Path $tmp -Value "hello" -Encoding Ascii
# $form = [System.Collections.Generic.List[System.Object]]::new()
# foreach($k in $res.fields.Keys){ $form.Add(@{ name=$k; value=$res.fields[$k] }) }
# $form.Add(@{ name="file"; file=$tmp; filename="dummy.mov"; ContentType=$Mime })
# Invoke-WebRequest -Method Post -Uri $res.url -Form $form -UseBasicParsing | Select-Object StatusCode,Headers
