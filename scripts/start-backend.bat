@echo off
cd /d "%~dp0.."

if exist "pcastpro-backend.exe" (
    start "" "http://localhost:3000"
    pcastpro-backend.exe
) else (
    cd /d "%~dp0..\backend"
    start "" "http://localhost:3000"
    node server.js
)

