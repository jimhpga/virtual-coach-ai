$fp = ".\app\report-beta\ReportBetaClient.tsx"
if(!(Test-Path $fp)){ throw "File not found: $fp" }

# Read file
$txt = Get-Content $fp -Raw

# Strip block comments and line comments (simple + effective)
$s = [regex]::Replace($txt, "(?s)/\*.*?\*/", "")
$s = [regex]::Replace($s, "(?m)//.*$", "")

# Strip normal strings (single + double) to reduce false brace hits
# (We intentionally do NOT try to strip template literals to avoid PowerShell backtick issues.)
$s = [regex]::Replace($s, "(?s)'(?:\\.|[^'])*'", "''")
$s = [regex]::Replace($s, '(?s)"(?:\\.|[^"])*"', '""')

$lines = $s -split "`r?`n"

$stack = New-Object System.Collections.Generic.Stack[object]
$lineNo = 0

foreach($line in $lines){
  $lineNo++
  $chars = $line.ToCharArray()
  for($i=0; $i -lt $chars.Length; $i++){
    $c = $chars[$i]
    if($c -eq "{"){
      $stack.Push([pscustomobject]@{ line=$lineNo; col=$i; text=$line.Trim() })
    } elseif($c -eq "}"){
      if($stack.Count -eq 0){
        Write-Host ("❌ Extra '}' found at line {0} col {1}" -f $lineNo, $i) -ForegroundColor Red
        exit 1
      } else {
        $null = $stack.Pop()
      }
    }
  }
}

Write-Host ("Unclosed blocks count: {0}" -f $stack.Count) -ForegroundColor Cyan

if($stack.Count -gt 0){
  $top = $stack.Peek()
  Write-Host "⚠️ Likely missing a closing '}' for something opened around:" -ForegroundColor Yellow
  Write-Host ("   line {0}, col {1}: {2}" -f $top.line, $top.col, $top.text) -ForegroundColor Yellow

  # Show real file context around that line
  $real = Get-Content $fp
  $start = [Math]::Max(1, $top.line - 15)
  $end   = [Math]::Min($real.Count, $top.line + 15)
  $start..$end | ForEach-Object { "{0,4}: {1}" -f $_, $real[$_-1] }

  exit 2
} else {
  Write-Host "✅ Braces look balanced. If you still get EOF, it's likely a JSX tag mismatch." -ForegroundColor Green
  exit 0
}
