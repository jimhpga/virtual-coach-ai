@echo off
setlocal
cd /d %~dp0

echo.
echo ============================================
echo   VCA - PROD Deploy + Health Check
echo ============================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File ".\Prod-HealthCheck-AutoURL-PROD.ps1"
echo.
echo Done.
pause
