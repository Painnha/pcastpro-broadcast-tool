@echo off
setlocal enabledelayedexpansion

title PCastPro - Quick Start
cls
echo.
echo Dang khoi dong PCastPro...
echo.

:: Cap nhat tu GitHub
cd /d "%~dp0"
if exist ".git" (
	echo Dang dong bo voi GitHub va ghi de thay doi...
    git fetch origin
    git reset --hard origin/main
)

:: Chuyen den backend
cd /d "%~dp0backend"

:: Cai dat dependencies neu chua co
if not exist "node_modules" (
    echo Dang cai dat dependencies...
    npm install >nul 2>&1
    if errorlevel 1 goto npm_failed
)

:: Mo trinh duyet
timeout /t 1 /nobreak >nul
start "" "http://localhost:3000"

:: Khoi dong server
cls
echo.
echo [✓] PCastPro dang chay tai: http://localhost:3000
echo.
echo Khong dong cua so nay!
echo De dung server: Nhan Ctrl+C
echo.
npm run dev
goto end

:npm_failed
cls
echo.
echo [X] LOI: Khong the cai dat dependencies!
echo.
echo Vui long kiem tra:
echo - Node.js da duoc cai dat chua? Chay: install-nodejs.bat
echo - Ket noi internet
echo.
pause
exit /b 1

:end
exit /b 0
