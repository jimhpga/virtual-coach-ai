@echo off
cd /d %~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File ".\Prod-HealthCheck.ps1"
pause
