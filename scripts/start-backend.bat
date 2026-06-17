@echo off
cd /d "%~dp0..\backend"
start "" "http://localhost:3000"
node server.js
