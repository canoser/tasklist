@echo off
title Mentorum Localhost Baslatici
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-localhost.ps1"
if %ERRORLEVEL% neq 0 pause
