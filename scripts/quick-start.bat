@echo off
setlocal enabledelayedexpansion

title PCastPro - Quick Start
cls
echo.
echo Dang khoi dong PCastPro...
echo.

:: Chuyen ve thu muc goc
cd /d "%~dp0.."

:: Kiem tra neu co file EXE da dong goi
if exist "pcastpro-backend.exe" (
    :: Mo trinh duyet
    timeout /t 1 /nobreak >nul
    start "" "http://localhost:3000"
    
    cls
    echo.
    echo [✓] PCastPro dang chay tai: http://localhost:3000 (Phien ban da dong goi)
    echo.
    echo Khong dong cua so nay!
    echo.
    pcastpro-backend.exe
    goto end
)

:: Neu khong co EXE, chay o che do phat trien (Node.js)
echo Khong tim thay file dong goi (pcastpro-backend.exe).
echo Dang khoi dong o che do phat trien (Node.js)...
echo.

:: Cap nhat tu GitHub trong che do Dev neu co .git
if exist ".git" (
    echo Dang dong bo voi GitHub...
    git fetch origin
    git reset --hard origin/main
)

:: Chuyen den backend
cd /d "%~dp0backend"

:: Cai dat dependencies neu chua co
if not exist "node_modules" (
    echo Dang cai dat dependencies cho backend...
    call npm install >nul 2>&1
    if errorlevel 1 goto npm_failed
)

:: Mo trinh duyet
timeout /t 1 /nobreak >nul
start "" "http://localhost:3000"

cls
echo.
echo [✓] PCastPro dang chay tai: http://localhost:3000 (Che do phat trien Node.js)
echo.
echo Khong dong cua so nay!
echo De dung server: Nhan Ctrl+C
echo.
call npm run dev
goto end

:npm_failed
cls
echo.
echo [X] LOI: Khong the cai dat dependencies!
echo.
echo Vui long kiem tra:
echo - Node.js da duoc cai dat chua? Chay: scripts\install-nodejs.bat
echo - Ket noi internet
echo.
pause
exit /b 1

:end
exit /b 0
