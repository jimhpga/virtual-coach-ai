$ErrorActionPreference="SilentlyContinue"
$base="http://localhost:3000"

function Hit($url){
  try {
    $r = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 6
    "{0}  {1}" -f $r.StatusCode, $url
  } catch {
    $code = $_.Exception.Response.StatusCode.value__ 2>$null
    if($code){ "{0}  {1}" -f $code, $url } else { "ERR  $url" }
  }
}

Hit "$base/"
Hit "$base/report-beta"
Hit "$base/report-beta?golden=1"
