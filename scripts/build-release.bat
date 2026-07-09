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

:: Nhap ghi chu cap nhat
set /p RELEASE_NOTES="Nhap ghi chu cap nhat (cach nhau bang dau phay): "
if "%RELEASE_NOTES%"=="" (
    set "RELEASE_NOTES=Cap nhat phien ban %NEW_VERSION%"
)

:: ============================================================
:: BUOC 1: Bien dich backend thanh file EXE
:: ============================================================
echo.
echo [1/4] Dang bien dich backend thanh file EXE...
cd /d "%~dp0..\backend"

echo [INFO] Dang cap nhat so phien ban %NEW_VERSION% vao backend...
call npm version %NEW_VERSION% --no-git-tag-version --allow-same-version
powershell -Command "(Get-Content -Path services/updateService.js -Raw) -replace 'const CURRENT_VERSION = ''.*?'';', 'const CURRENT_VERSION = ''%NEW_VERSION%'';' | Out-File -FilePath services/updateService.js -Encoding utf8"

if not exist "node_modules\pkg" (
    echo [INFO] Dang cai dat pkg...
    call npm install --save-dev pkg >nul 2>&1
)
call npx pkg . --targets node18-win-x64 --output ../PCastPro.exe

if errorlevel 1 (
    echo [X] LOI: Khong the bien dich backend thanh file EXE!
    pause
    exit /b 1
)
echo [OK] Da bien dich thanh cong PCastPro.exe.

:: ============================================================
:: BUOC 2: Luu tru (archive) phien ban cu
:: ============================================================
echo.
echo [2/4] Dang luu tru phien ban cu...
cd /d "%~dp0.."

:: Tao thu muc archive neu chua co
if not exist "release-archive" (
    mkdir "release-archive"
)

:: Doc version cu tu version.json (neu ton tai) va luu zip cu
powershell -Command "$dist = '%~dp0..'; $versionPath = Join-Path $dist 'netlify-update-dist/version.json'; $zipPath = Join-Path $dist 'netlify-update-dist/pcastpro-latest.zip'; if ((Test-Path $versionPath) -and (Test-Path $zipPath)) { $data = Get-Content -Raw -Path $versionPath | ConvertFrom-Json; $oldVersion = $data.version; if ($oldVersion -ne '%NEW_VERSION%') { $archivePath = Join-Path $dist ('release-archive/pcastpro-v' + $oldVersion + '.zip'); if (-not (Test-Path $archivePath)) { Copy-Item -Path $zipPath -Destination $archivePath -Force; Write-Host '[OK] Da luu tru: pcastpro-v' $oldVersion '.zip' } else { Write-Host '[SKIP] Ban luu tru pcastpro-v' $oldVersion '.zip da ton tai.' } } else { Write-Host '[SKIP] Cung phien ban, khong can luu tru.' } } else { Write-Host '[SKIP] Khong tim thay version.json hoac zip cu.' }"

:: ============================================================
:: BUOC 3: Tao thu muc phan phoi va nen file zip moi
:: ============================================================
echo.
echo [3/4] Dang tao file zip va cap nhat version.json...
powershell -Command "$root = '%~dp0..'; $temp = Join-Path $root 'netlify-temp'; $dist = Join-Path $root 'netlify-update-dist'; if (Test-Path $temp) { Remove-Item -Path $temp -Recurse -Force }; New-Item -ItemType Directory -Path $temp | Out-Null; if (-not (Test-Path $dist)) { New-Item -ItemType Directory -Path $dist | Out-Null }; Copy-Item -Path (Join-Path $root 'frontend') -Destination (Join-Path $temp 'frontend') -Recurse -Force; Copy-Item -Path (Join-Path $root 'shared') -Destination (Join-Path $temp 'shared') -Recurse -Force; Copy-Item -Path (Join-Path $root 'themes') -Destination (Join-Path $temp 'themes') -Recurse -Force; $tempScripts = Join-Path $temp 'scripts'; New-Item -ItemType Directory -Path $tempScripts | Out-Null; Copy-Item -Path (Join-Path $root 'scripts/quick-start.bat') -Destination (Join-Path $tempScripts 'quick-start.bat') -Force; Copy-Item -Path (Join-Path $root 'scripts/start-backend.bat') -Destination (Join-Path $tempScripts 'start-backend.bat') -Force; Copy-Item -Path (Join-Path $root 'PCastPro.exe') -Destination (Join-Path $temp 'PCastPro.exe') -Force; Add-Type -AssemblyName System.IO.Compression.FileSystem; $zipPath = Join-Path $dist 'pcastpro-latest.zip'; if (Test-Path $zipPath) { Remove-Item -Path $zipPath -Force }; [System.IO.Compression.ZipFile]::CreateFromDirectory($temp, $zipPath); Remove-Item -Path $temp -Recurse -Force; $versionPath = Join-Path $dist 'version.json'; $history = @(); if (Test-Path $versionPath) { $oldData = Get-Content -Raw -Path $versionPath | ConvertFrom-Json; if ($oldData) { if ($oldData.version -ne '%NEW_VERSION%') { $historyEntry = @{ version = $oldData.version; date = (Get-Date -Format 'yyyy-MM-dd'); releaseNotes = $oldData.releaseNotes }; if ($oldData.history) { $history = $oldData.history }; $history += $historyEntry } else { if ($oldData.history) { $history = $oldData.history } } } }; $notesArray = '%RELEASE_NOTES%'.Split(',') | ForEach-Object { $_.Trim() }; $versionObj = [PSCustomObject]@{ version = '%NEW_VERSION%'; downloadUrl = 'https://github.com/Painnha/pcastpro-update-cdn/releases/latest/download/pcastpro-latest.zip'; releaseNotes = $notesArray; history = $history }; $versionObj | ConvertTo-Json -Depth 5 | Out-File -FilePath $versionPath -Encoding utf8"

if errorlevel 1 (
    echo [X] LOI: Khong the nen file ZIP va cap nhat phien ban!
    pause
    exit /b 1
)
echo [OK] Da tao xong file zip va version.json.

:: ============================================================
:: BUOC 4: Tu dong push version.json len GitHub (Netlify se tu deploy)
:: ============================================================
echo.
echo [4/4] Dang day file cau hinh len GitHub...
cd /d "%~dp0..\netlify-update-dist"

:: Dam bao co file .gitignore de khong push file zip len git
if not exist ".gitignore" (
    echo pcastpro-latest.zip > .gitignore
)

git add .gitignore version.json
git commit -m "v%NEW_VERSION%: %RELEASE_NOTES%"
git push origin main

if errorlevel 1 (
    echo [!] CANH BAO: Khong the push len GitHub tu dong.
    echo     Ban co the push thu cong bang lenh: cd netlify-update-dist ^&^& git push origin main
) else (
    echo [OK] Da push cau hinh version.json len GitHub!
)

:: ============================================================
:: KET THUC
:: ============================================================
echo.
echo ===================================================
echo  [OK] DONG GOI VA PHAT HANH HOAN TAT!
echo ===================================================
echo  Phien ban  : %NEW_VERSION%
echo  Zip moi    : netlify-update-dist/pcastpro-latest.zip
echo  GitHub repo: github.com/Painnha/pcastpro-update-cdn
echo.
echo  Luu y: Ban can upload file zip len GitHub Releases thu cong:
echo  1. Truy cap: https://github.com/Painnha/pcastpro-update-cdn/releases
echo  2. Tao release moi voi tag v%NEW_VERSION%
echo  3. Upload file 'netlify-update-dist/pcastpro-latest.zip' lam asset.
echo ===================================================
echo.
pause
exit /b 0
