@echo off
echo ========================================
echo  Starting All Backend Services
echo ========================================
echo.

REM Get the directory of this batch file
set "SCRIPT_DIR=%~dp0"

REM Start Node.js backend in new window
echo [INFO] Starting Node.js Backend...
start "Node.js Backend" cmd /k "cd /d "%SCRIPT_DIR%backend" && npm start"
timeout /t 2 /nobreak >nul

REM Start Python backend in new window
echo [INFO] Starting Python Backend...
start "Python Backend" cmd /k "cd /d "%SCRIPT_DIR%" && start-python-backend.bat"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo  All Backend Services Started!
echo ========================================
echo.
echo  Node.js Backend: http://localhost:3000
echo  Python Backend:  http://127.0.0.1:5000
echo.
echo  Check the separate windows for logs
echo  Press any key to exit this window
echo ========================================

pause

