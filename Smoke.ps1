$base="http://localhost:3000"
"/","/upload","/report" | %{
  try { $r=Invoke-WebRequest -UseBasicParsing ($base+$_) -TimeoutSec 5; "{0,-10} {1}" -f $_,$r.StatusCode }
  catch { "{0,-10} FAIL {1}" -f $_,$_.Exception.Message }
}
