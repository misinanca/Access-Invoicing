@echo off
REM No admin required. Bypasses PowerShell script policy for this file only.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local.ps1"
exit /b %ERRORLEVEL%
