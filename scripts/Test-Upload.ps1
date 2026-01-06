param(
  [Parameter(Mandatory=$true)]
  [string]$FilePath,
  [string]$Url = "http://localhost:3001/api/upload"
)

if (!(Test-Path $FilePath)) { throw "File not found: $FilePath" }

curl.exe -sS -i -X POST $Url -F ("video=@{0};type=video/mp4" -f $FilePath)
