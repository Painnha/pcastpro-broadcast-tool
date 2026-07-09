const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { projectRoot } = require('../config/pathHelper');

const CURRENT_VERSION = '1.0.3';
const UPDATE_CONFIG_URL = 'https://pcastpro.nguyentriphong.id.vn/version.json';

// Helper to compare version numbers
function isNewerVersion(remote, local) {
    const rParts = remote.split('.').map(Number);
    const lParts = local.split('.').map(Number);
    for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
        const rVal = rParts[i] || 0;
        const lVal = lParts[i] || 0;
        if (rVal > lVal) return true;
        if (rVal < lVal) return false;
    }
    return false;
}

// Helper to download file
async function downloadFile(url, destPath) {
    const writer = fs.createWriteStream(destPath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function checkForUpdates() {
    // Only perform auto-update if running as a packaged EXE
    if (!process.pkg) {
        console.log('Development mode (Node.js): Skipping auto-update.');
        return;
    }

    console.log('Checking for updates from pcastpro.nguyentriphong.id.vn...');
    try {
        const response = await axios.get(UPDATE_CONFIG_URL, { timeout: 8000 });
        const remoteData = response.data;

        if (remoteData && remoteData.version && isNewerVersion(remoteData.version, CURRENT_VERSION)) {
            console.log(`Found new version: ${remoteData.version} (Current: ${CURRENT_VERSION})`);
            console.log('Downloading update...');

            const tempZipPath = path.join(projectRoot, 'update_temp.zip');
            await downloadFile(remoteData.downloadUrl, tempZipPath);

            console.log('Download successful. Installing update...');

            const currentPid = process.pid;
            const batPath = path.join(projectRoot, 'update_runner.bat');
            const extractDir = path.join(projectRoot, 'update_extract_temp');
            const exeName = 'PCastPro.exe';

            // Write a visible .bat updater script with clear user-facing messages
            const batContent = [
                '@echo off',
                'chcp 65001 >nul 2>&1',
                'title PCastPro - Dang cap nhat...',
                'color 0B',
                'echo.',
                'echo  ====================================================',
                'echo   PCastPro - Tu dong cap nhat',
                'echo  ====================================================',
                'echo.',
                'echo   [1/4] Dang cho ung dung dong lai...',
                '',
                ':waitloop',
                `tasklist /FI "PID eq ${currentPid}" 2>NUL | find /I "${currentPid}" >NUL`,
                'if not errorlevel 1 (',
                '    timeout /t 1 /nobreak >nul',
                '    goto waitloop',
                ')',
                'timeout /t 2 /nobreak >nul',
                'echo   [OK] Ung dung da dong.',
                'echo.',
                '',
                'echo   [2/4] Dang giai nen ban cap nhat...',
                `if exist "${extractDir}" rmdir /s /q "${extractDir}"`,
                `powershell -NoProfile -Command "Expand-Archive -Path '${tempZipPath}' -DestinationPath '${extractDir}' -Force"`,
                'if errorlevel 1 (',
                '    color 0C',
                '    echo.',
                '    echo   [LOI] Khong the giai nen file cap nhat!',
                `    echo   Chi tiet loi da ghi vao update_error.log`,
                `    echo %date% %time% Expand-Archive failed >> "${path.join(projectRoot, 'update_error.log')}"`,
                '    echo.',
                '    pause',
                '    exit /b 1',
                ')',
                'echo   [OK] Giai nen thanh cong.',
                'echo.',
                '',
                'echo   [3/4] Dang cai dat ban cap nhat...',
                `set "SOURCE_DIR=${extractDir}"`,
                `for /f "delims=" %%d in ('dir /b /ad "${extractDir}" 2^>nul') do (`,
                `    set "SUBFOLDER=${extractDir}\\%%d"`,
                ')',
                `for /f %%c in ('dir /b /ad "${extractDir}" 2^>nul ^| find /c /v ""') do (`,
                '    if %%c==1 set "SOURCE_DIR=%SUBFOLDER%"',
                ')',
                `robocopy "%SOURCE_DIR%" "${projectRoot}" /E /XF .env /R:5 /W:2 /NFL /NDL /NJH /NJS /NS /NC /NP`,
                'echo   [OK] Cai dat thanh cong.',
                'echo.',
                '',
                'echo   [4/4] Dang don dep...',
                `if exist "${extractDir}" rmdir /s /q "${extractDir}"`,
                `if exist "${tempZipPath}" del /f /q "${tempZipPath}"`,
                'echo   [OK] Don dep xong.',
                'echo.',
                '',
                'color 0A',
                'echo  ====================================================',
                'echo   CAP NHAT THANH CONG!',
                'echo  ====================================================',
                'echo.',
                `echo   Vui lòng khởi động lại file "${exeName}" để sử dụng phiên bản mới.`,
                'echo.',
                'echo  ====================================================',
                'echo.',
                'pause',
                `(del /f /q "%~f0" & exit)`,
            ].join('\r\n');

            fs.writeFileSync(batPath, batContent, 'utf8');

            // Launch the updater in a NEW visible terminal window
            const child = spawn('cmd.exe', ['/c', 'start', 'PCastPro Updater', batPath], {
                detached: true,
                stdio: 'ignore'
            });
            child.unref();

            console.log('Application will close to complete the update...');
            process.exit(0);
        } else {
            console.log('PCastPro is up to date.');
        }
    } catch (error) {
        console.error('Failed to check or install updates:', error.message);
        try {
            const tempZipPath = path.join(projectRoot, 'update_temp.zip');
            if (fs.existsSync(tempZipPath)) {
                fs.unlinkSync(tempZipPath);
                console.log('Cleaned up corrupted update file.');
            }
        } catch (cleanupError) {
            // Ignore error during cleanup
        }
        console.log('Continuing to start the application with the current version.');
    }
}

module.exports = {
    checkForUpdates,
    CURRENT_VERSION
};





