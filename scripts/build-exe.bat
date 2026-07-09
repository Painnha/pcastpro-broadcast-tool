@echo off
setlocal enabledelayedexpansion

title PCastPro - Compile to EXE
cls
echo.
echo ========================================
echo  PCastPro - Dong goi Backend thanh EXE
echo ========================================
echo.

cd /d "%~dp0..\backend"

:: Kiem tra neu da cai dat pkg hay chua
if not exist "node_modules\pkg" (
    echo Dang cai dat thu vien dong goi 'pkg'...
    call npm install --save-dev pkg
)

echo.
echo Dang dong goi backend thanh file PCastPro.exe...
echo.

:: Bien dich bang pkg. Dat dich den la node18-win-x64, dau ra dat tai thu muc goc.
call npx pkg . --targets node18-win-x64 --output ../PCastPro.exe

if errorlevel 1 (
    echo.
    echo [X] LOI: Khong the dong goi ung dung!
    pause
    exit /b 1
)

echo.
echo [✓] THANH CONG! File 'PCastPro.exe' da duoc tao o thu muc goc.
echo.
pause
exit /b 0
