@echo off
cd /d "%~dp0.."

if exist "PCastPro.exe" (
    start "" "http://localhost:3000"
    PCastPro.exe
) else (
    cd /d "%~dp0..\backend"
    start "" "http://localhost:3000"
    node server.js
)

