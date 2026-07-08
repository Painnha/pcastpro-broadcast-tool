@echo off
setlocal enabledelayedexpansion

title PCastPro - Build Release Package
cls
echo.
echo ===================================================
echo  PCastPro - Kich ban tu dong dong goi va phat hanh
echo ===================================================
echo.

:: Nhap so phien ban moi
set /p NEW_VERSION="Nhap so phien ban moi (vi du: 1.0.1): "
if "%NEW_VERSION%"=="" (
    echo [X] LOI: Khong duoc de trong phien ban!
    pause
    exit /b 1
)

:: Chuyen den backend va bien dich file EXE
echo.
echo 1. Dang bien dich backend thanh file EXE...
cd /d "%~dp0..\backend"
if not exist "node_modules\pkg" (
    echo [INFO] Dang cai dat pkg...
    call npm install --save-dev pkg >nul 2>&1
)
call npx pkg . --targets node18-win-x64 --output ../pcastpro-backend.exe

if errorlevel 1 (
    echo [X] LOI: Khong the bien dich backend thanh file EXE!
    pause
    exit /b 1
)
echo [✓] Da bien dich thanh cong pcastpro-backend.exe o thu muc goc.

:: Chạy PowerShell script để đóng gói zip và cập nhật version.json
echo.
echo 2. Dang tao thu muc phan phoi va nen file zip...
powershell -Command "$root = '%~dp0..'; $temp = Join-Path $root 'netlify-temp'; $dist = Join-Path $root 'netlify-update-dist'; if (Test-Path $temp) { Remove-Item -Path $temp -Recurse -Force }; New-Item -ItemType Directory -Path $temp | Out-Null; if (-not (Test-Path $dist)) { New-Item -ItemType Directory -Path $dist | Out-Null }; Copy-Item -Path (Join-Path $root 'frontend') -Destination (Join-Path $temp 'frontend') -Recurse -Force; Copy-Item -Path (Join-Path $root 'shared') -Destination (Join-Path $temp 'shared') -Recurse -Force; Copy-Item -Path (Join-Path $root 'themes') -Destination (Join-Path $temp 'themes') -Recurse -Force; $tempScripts = Join-Path $temp 'scripts'; New-Item -ItemType Directory -Path $tempScripts | Out-Null; Copy-Item -Path (Join-Path $root 'scripts/quick-start.bat') -Destination (Join-Path $tempScripts 'quick-start.bat') -Force; Copy-Item -Path (Join-Path $root 'scripts/start-backend.bat') -Destination (Join-Path $tempScripts 'start-backend.bat') -Force; Copy-Item -Path (Join-Path $root 'pcastpro-backend.exe') -Destination (Join-Path $temp 'pcastpro-backend.exe') -Force; Add-Type -AssemblyName System.IO.Compression.FileSystem; $zipPath = Join-Path $dist 'pcastpro-latest.zip'; if (Test-Path $zipPath) { Remove-Item -Path $zipPath -Force }; [System.IO.Compression.ZipFile]::CreateFromDirectory($temp, $zipPath); Remove-Item -Path $temp -Recurse -Force; $versionObj = [PSCustomObject]@{ version = '%NEW_VERSION%'; downloadUrl = 'https://pcastpro.nguyentriphong.id.vn/pcastpro-latest.zip'; releaseNotes = @('Cap nhat phien ban %NEW_VERSION%') }; $versionObj | ConvertTo-Json | Out-File -FilePath (Join-Path $dist 'version.json') -Encoding utf8"

if errorlevel 1 (
    echo [X] LOI: Khong the nen file ZIP va cap nhat phien ban!
    pause
    exit /b 1
)

echo.
echo ===================================================
echo  [✓] DONG GOI HOAN TAT!
echo ===================================================
echo  Phien ban: %NEW_VERSION%
echo  Thu muc dau ra: netlify-update-dist/
echo.
echo  Hay keo tha thu muc 'netlify-update-dist/' len Netlify de phat hanh!
echo ===================================================
echo.
pause
exit /b 0
