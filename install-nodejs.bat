@echo off
setlocal enabledelayedexpansion

title PCastPro - Node.js Installer
cls

:: Kiem tra Node.js
node --version >nul 2>&1
if errorlevel 1 goto install_nodejs
goto already_installed

:install_nodejs
cls
echo Dang cai dat Node.js...
echo.

:: Tao thu muc tam
set "TEMP_DIR=%TEMP%\PCastPro_NodeJS"
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%" >nul 2>&1

:: Tai Node.js
powershell -ExecutionPolicy Bypass -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi' -OutFile '%TEMP_DIR%\nodejs-installer.msi'}" >nul 2>&1

if not exist "%TEMP_DIR%\nodejs-installer.msi" goto download_failed

:: Cai dat
start /wait msiexec /i "%TEMP_DIR%\nodejs-installer.msi" /quiet /norestart

:: Xoa file tam
del "%TEMP_DIR%\nodejs-installer.msi" >nul 2>&1
rmdir "%TEMP_DIR%" >nul 2>&1

:: Kiem tra lai
node --version >nul 2>&1
if errorlevel 1 goto install_failed

cls
echo.
echo [✓] Da cai dat Node.js thanh cong!
echo.
pause
exit /b 0

:already_installed
cls
echo.
echo [✓] Node.js da duoc cai dat!
echo.
pause
exit /b 0

:download_failed
cls
echo.
echo [X] LOI: Khong the tai Node.js!
echo.
echo Vui long cai dat thu cong tai: https://nodejs.org/
echo.
pause
exit /b 1

:install_failed
cls
echo.
echo [X] LOI: Cai dat that bai!
echo.
echo Vui long:
echo - Khoi dong lai Command Prompt
echo - Hoac cai dat thu cong tai: https://nodejs.org/
echo.
pause
exit /b 1
