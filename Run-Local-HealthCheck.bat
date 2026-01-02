@echo off
cd /d %~dp0
REM Uses PORT env var if set; defaults to 3005
powershell -NoProfile -ExecutionPolicy Bypass -File ".\Local-HealthCheck.ps1"
pause
