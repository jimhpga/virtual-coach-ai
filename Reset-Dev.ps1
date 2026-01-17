taskkill /IM node.exe /F 2>$null
if (Test-Path .\.next) { attrib -R -S -H .\.next\* /S /D; Remove-Item -Recurse -Force .\.next }
Remove-Item .\devlog.txt -Force -ErrorAction SilentlyContinue
Start-Process -FilePath "cmd.exe" -WorkingDirectory (Get-Location) -ArgumentList "/c", "npm run dev > devlog.txt 2>&1"
Start-Sleep -Seconds 2
curl.exe -sS -D - -o NUL "http://localhost:3000/report-beta?golden=1" | Select-String "^HTTP/"
