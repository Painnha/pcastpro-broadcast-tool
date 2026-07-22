const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { projectRoot } = require('../config/pathHelper');

const CURRENT_VERSION = '2.6';
const UPDATE_MANIFEST_URL = process.env.UPDATE_MANIFEST_URL || 'https://pcastpro.nguyentriphong.id.vn/manifest.json';
const UPDATE_CONFIG_URL = process.env.UPDATE_CONFIG_URL || 'https://pcastpro.nguyentriphong.id.vn/version.json';

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

/**
 * Compute SHA-256 hash of a local file using streaming
 */
function computeFileHash(filePath) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            return resolve(null);
        }
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', data => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

/**
 * Cleanup any leftover .tmp files from previously interrupted downloads
 */
function cleanOrphanedTempFiles(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) return;
        const files = fs.readdirSync(dirPath);
        let cleanedCount = 0;
        for (const file of files) {
            if (file.endsWith('.tmp')) {
                const fullPath = path.join(dirPath, file);
                fs.unlinkSync(fullPath);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            console.log(`ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â¹ Cleaned up ${cleanedCount} orphaned .tmp file(s) in ${dirPath}`);
        }
    } catch (err) {
        console.error('ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Error cleaning orphaned .tmp files:', err.message);
    }
}

// Helper to download file (used by Core ZIP updater)
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

/**
 * Atomic Stream Download:
 * Downloads to .tmp file first, verifies SHA-256 hash, then fs.renameSync to final .dat file.
 */
async function downloadAssetAtomic(asset, baseUrl, localPath, tempPath, progressCallback) {
    let fileDownloadUrl;
    if (asset.downloadUrl) {
        fileDownloadUrl = asset.downloadUrl;
    } else {
        const fileName = path.basename(asset.path);
        fileDownloadUrl = `${baseUrl.replace(/\/$/, '')}/${fileName}`;
    }

    try {
        const response = await axios({
            url: fileDownloadUrl,
            method: 'GET',
            responseType: 'stream',
            timeout: 30000
        });

        const totalBytes = parseInt(response.headers['content-length'] || asset.size || '0', 10);
        let downloadedBytes = 0;

        const writer = fs.createWriteStream(tempPath);

        response.data.on('data', chunk => {
            downloadedBytes += chunk.length;
            if (progressCallback && totalBytes > 0) {
                progressCallback({
                    downloadedBytes,
                    totalBytes,
                    percent: Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
                });
            }
        });

        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
            response.data.on('error', reject);
        });

        // Step 2: Verify Hash of downloaded .tmp file
        const downloadedHash = await computeFileHash(tempPath);
        if (downloadedHash !== asset.hash) {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            throw new Error(`Hash mismatch for ${path.basename(asset.path)} (Expected: ${asset.hash}, Got: ${downloadedHash})`);
        }

        // Step 3: Atomic Rename .tmp -> .dat
        fs.renameSync(tempPath, localPath);
        return { success: true };
    } catch (error) {
        if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch (e) { }
        }
        throw error;
    }
}

/**
 * Scan local asset files against manifest.json, detect missing/corrupted files,
 * and repair them atomically in the background.
 */
async function scanAndRepairAssets(manifest, broadcastFn) {
    const assetBaseDir = path.join(projectRoot, 'frontend', 'images', 'heroMotion', 'encrypted');

    if (!fs.existsSync(assetBaseDir)) {
        fs.mkdirSync(assetBaseDir, { recursive: true });
    }

    cleanOrphanedTempFiles(assetBaseDir);

    if (!manifest || !Array.isArray(manifest.assets)) {
        console.log('ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¹ÃƒÂ¯Ã‚Â¸Ã‚Â Manifest contains no asset list. Skipping asset scan.');
        return;
    }

    const totalAssets = manifest.assets.length;
    console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â Scanning ${totalAssets} Motion Hero assets against Manifest...`);

    if (broadcastFn) {
        broadcastFn({
            type: 'update-progress',
            status: 'scanning',
            message: `Ãƒâ€žÃ‚Âang kiÃƒÂ¡Ã‚Â»Ã†â€™m tra dÃƒÂ¡Ã‚Â»Ã‚Â¯ liÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡u ${totalAssets} video hero...`,
            totalAssets,
            scannedAssets: 0
        });
    }

    const filesToDownload = [];
    let scannedCount = 0;

    for (const asset of manifest.assets) {
        scannedCount++;
        const fileName = path.basename(asset.path);
        const localPath = path.join(assetBaseDir, fileName);
        const tempPath = path.join(assetBaseDir, `${fileName}.tmp`);

        let needDownload = false;
        if (!fs.existsSync(localPath)) {
            needDownload = true;
        } else {
            const localHash = await computeFileHash(localPath);
            if (localHash !== asset.hash) {
                console.warn(`ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Corrupted asset: ${fileName} (Hash mismatch)`);
                needDownload = true;
            }
        }

        if (needDownload) {
            filesToDownload.push({ asset, localPath, tempPath });
        }

        if (broadcastFn && scannedCount % 10 === 0) {
            broadcastFn({
                type: 'update-progress',
                status: 'scanning',
                message: 'Dang kiem tra phien ban Core...',
                totalAssets,
                scannedAssets: scannedCount
            });
        }
    }

    if (filesToDownload.length === 0) {
        console.log('[OK] Video Assets are fully up to date.');
        if (broadcastFn) {
            broadcastFn({
                type: 'update-progress',
                status: 'completed',
                message: 'Da hoan tat dong bo tai nguyen.',
                totalAssets,
                missingAssets: 0
            });
        }
        return;
    }

    console.log(`[INFO] Found ${filesToDownload.length}/${totalAssets} missing/corrupted asset(s). Starting background download...`);

    const baseUrl = manifest.assetsBaseUrl || 'https://github.com/Painnha/pcastpro-update-cdn/releases/download/v2.4/';
    let completedCount = 0;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;
    const totalToDownload = filesToDownload.length;
    let lastReportedPercent = -1;

    for (const item of filesToDownload) {
        const fileName = path.basename(item.asset.path);

        try {
            await downloadAssetAtomic(item.asset, baseUrl, item.localPath, item.tempPath, (fileProgress) => {
                // We no longer spam progress for every chunk, just report overall percent
                const overallPercent = Math.round(((completedCount + (fileProgress.percent / 100)) / totalToDownload) * 100);
                if (overallPercent !== lastReportedPercent) {
                    lastReportedPercent = overallPercent;
                    if (broadcastFn) {
                        broadcastFn({
                            type: 'update-progress',
                            status: 'downloading',
                            message: `Dang tai tai nguyen...`,
                            overallPercent: overallPercent
                        });
                    }
                    process.stdout.write(`\r[INFO] Dang tai tai nguyen... ${overallPercent}%`);
                }
            });

            completedCount++;
            consecutiveErrors = 0; // Reset counter on success
            // Remove the spammy per-file console.log here
        } catch (downloadErr) {
            consecutiveErrors++;
            console.error(`[ERROR] Failed to restore asset ${fileName}:`, downloadErr.message);

            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                console.warn(`[WARN] Continuous download failures (${consecutiveErrors}). Aborting download loop.`);
                if (broadcastFn) {
                    broadcastFn({
                        type: 'update-progress',
                        status: 'asset-sync-skipped',
                        message: 'Da bo qua tai nguyen do loi mang.',
                        completedFiles: completedCount,
                        totalFiles: totalToDownload
                    });
                }
                return;
            }
        }
    }
    
    console.log(); // Add a newline to terminate the \r progress line

    if (broadcastFn) {
        broadcastFn({
            type: 'update-progress',
            status: 'completed',
            message: `Hoan tat dong bo! (${completedCount}/${totalToDownload})`,
            completedFiles: completedCount,
            totalFiles: totalToDownload,
            overallPercent: 100
        });
    }
}

/**
 * Execute Core ZIP Update
 */
async function executeCoreZipUpdate(remoteData) {
    console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¦ Found new Core version: v${remoteData.version} (Current: v${CURRENT_VERSION})`);
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¥ Downloading Core update ZIP...');

    const tempZipPath = path.join(projectRoot, 'update_temp.zip');
    await downloadFile(remoteData.downloadUrl, tempZipPath);

    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¥ Download successful. Preparing updater script...');

    const currentPid = process.pid;
    const batPath = path.join(projectRoot, 'update_runner.bat');
    const extractDir = path.join(projectRoot, 'update_extract_temp');
    const exeName = 'PCastPro.exe';

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
        `taskkill /F /IM "${exeName}" >nul 2>&1`,
        `if exist "${path.join(projectRoot, exeName)}" (`,
        `    del /f /q "${path.join(projectRoot, exeName + '.old')}" >nul 2>&1`,
        `    rename "${path.join(projectRoot, exeName)}" "${exeName + '.old'}" >nul 2>&1`,
        ')',
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
        `if exist "${path.join(projectRoot, exeName + '.old')}" del /f /q "${path.join(projectRoot, exeName + '.old')}" >nul 2>&1`,
        'echo   [OK] Don dep xong.',
        'echo.',
        '',
        'color 0A',
        'echo  ====================================================',
        'echo   CAP NHAT THANH CONG!',
        'echo  ====================================================',
        'echo.',
        `echo   Vui long khoi dong lai file "${exeName}" de su dung phien ban moi.`,
        'echo.',
        'echo  ====================================================',
        'echo.',
        'pause',
        `(del /f /q "%~f0" & exit)`,
    ].join('\r\n');

    fs.writeFileSync(batPath, batContent, 'utf8');

    const child = spawn('cmd.exe', ['/c', 'start', 'PCastPro Updater', batPath], {
        detached: true,
        stdio: 'ignore'
    });
    child.unref();

    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Application will close to complete the Core update...');
    process.exit(0);
}

/**
 * Main Orchestrator - Synchronous Priority Update Flow
 */
async function checkForUpdates(broadcastFn) {
    try {
        const oldExe = path.join(projectRoot, 'PCastPro.exe.old');
        if (fs.existsSync(oldExe)) {
            fs.unlinkSync(oldExe);
            console.log('ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â¹ Ãƒâ€žÃ‚ÂÃƒÆ’Ã‚Â£ dÃƒÂ¡Ã‚Â»Ã‚Ân dÃƒÂ¡Ã‚ÂºÃ‚Â¹p file cÃƒâ€¦Ã‚Â© PCastPro.exe.old');
        }
    } catch (e) {
        console.error('ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â KhÃƒÆ’Ã‚Â´ng thÃƒÂ¡Ã‚Â»Ã†â€™ dÃƒÂ¡Ã‚Â»Ã‚Ân dÃƒÂ¡Ã‚ÂºÃ‚Â¹p file cÃƒâ€¦Ã‚Â© PCastPro.exe.old:', e.message);
    }

    console.log('');
    console.log('  ÃƒÂ¢Ã¢â‚¬ÂÃ…â€™ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‚Â');
    console.log('  ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡  ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Unified Delta Updater - Orchestrator     ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡');
    console.log('  ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ‹Å“');
    console.log('');
    console.log('  [Phase 1/3] Checking Core version...');

    if (broadcastFn) {
        broadcastFn({
            type: 'update-progress',
            status: 'checking',
            message: 'Ãƒâ€žÃ‚Âang kiÃƒÂ¡Ã‚Â»Ã†â€™m tra phiÃƒÆ’Ã‚Âªn bÃƒÂ¡Ã‚ÂºÃ‚Â£n Core...'
        });
    }

    let coreUpdateTriggered = false;

    try {
        const coreResponse = await axios.get(UPDATE_CONFIG_URL, { timeout: 8000 });
        const remoteData = coreResponse.data;

        if (remoteData && remoteData.version && isNewerVersion(remoteData.version, CURRENT_VERSION)) {
            console.log(`  [Phase 2/3] ÃƒÂ¢Ã…Â¡Ã‚Â¡ Core Update Available: v${remoteData.version} (Local: v${CURRENT_VERSION})`);
            console.log('  ÃƒÂ¢Ã¢â‚¬ÂºÃ¢â‚¬Â HALTING asset check to avoid Race Condition.');
            console.log('  ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¦ Initiating Core ZIP download & update process...');

            if (broadcastFn) {
                broadcastFn({
                    type: 'update-progress',
                    status: 'core-update-available',
                    message: `PhÃƒÆ’Ã‚Â¡t hiÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡n bÃƒÂ¡Ã‚ÂºÃ‚Â£n Core mÃƒÂ¡Ã‚Â»Ã¢â‚¬Âºi v${remoteData.version}. Ãƒâ€žÃ‚Âang tÃƒÂ¡Ã‚ÂºÃ‚Â£i cÃƒÂ¡Ã‚ÂºÃ‚Â­p nhÃƒÂ¡Ã‚ÂºÃ‚Â­t...`,
                    newVersion: remoteData.version,
                    currentVersion: CURRENT_VERSION
                });
            }

            if (process.pkg) {
                await executeCoreZipUpdate(remoteData);
            } else {
                console.log('  ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¹ÃƒÂ¯Ã‚Â¸Ã‚Â Development mode: Core update detected but skipping EXE replacement.');
                console.log(`  ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¹ÃƒÂ¯Ã‚Â¸Ã‚Â New version v${remoteData.version} available at: ${remoteData.downloadUrl}`);
            }

            coreUpdateTriggered = true;
            return;
        } else {
            console.log(`  [Phase 2/3] ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Core is up to date (v${CURRENT_VERSION}). No Core update needed.`);
        }
    } catch (coreErr) {
        console.warn(`  [Phase 2/3] ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Could not check Core version: ${coreErr.message}`);
        console.log('  ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Proceeding to Asset check anyway...');
    }

    if (!coreUpdateTriggered) {
        console.log('  [Phase 3/3] Core is up to date ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Proceeding to check Video Assets...');

        try {
            if (broadcastFn) {
                broadcastFn({
                    type: 'update-progress',
                    status: 'checking',
                    message: 'Core Ãƒâ€žÃ¢â‚¬ËœÃƒÆ’Ã‚Â£ mÃƒÂ¡Ã‚Â»Ã¢â‚¬Âºi nhÃƒÂ¡Ã‚ÂºÃ‚Â¥t. Ãƒâ€žÃ‚Âang kiÃƒÂ¡Ã‚Â»Ã†â€™m tra dÃƒÂ¡Ã‚Â»Ã‚Â¯ liÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡u Video Assets...'
                });
            }

            const manifestResponse = await axios.get(UPDATE_MANIFEST_URL, { timeout: 8000 });
            const manifest = manifestResponse.data;

            if (!manifest) {
                console.warn('  ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Empty manifest received. Skipping asset scan.');
                return;
            }

            await scanAndRepairAssets(manifest, broadcastFn);

        } catch (assetErr) {
            console.warn(`  ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Asset scan failed: ${assetErr.message}`);
            if (broadcastFn) {
                broadcastFn({
                    type: 'update-progress',
                    status: 'error',
                    message: `KiÃƒÂ¡Ã‚Â»Ã†â€™m tra dÃƒÂ¡Ã‚Â»Ã‚Â¯ liÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡u video: ${assetErr.message}`
                });
            }
        }
    }
}

module.exports = {
    checkForUpdates,
    scanAndRepairAssets,
    computeFileHash,
    cleanOrphanedTempFiles,
    CURRENT_VERSION
};





