const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { projectRoot } = require('../config/pathHelper');

const CURRENT_VERSION = '1.0.0';
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
        console.log('Chế độ phát triển (Node.js): Bỏ qua tự động cập nhật.');
        return;
    }

    console.log('Đang kiểm tra cập nhật từ pcastpro.nguyentriphong.id.vn...');
    try {
        const response = await axios.get(UPDATE_CONFIG_URL, { timeout: 8000 });
        const remoteData = response.data;

        if (remoteData && remoteData.version && isNewerVersion(remoteData.version, CURRENT_VERSION)) {
            console.log(`Tìm thấy phiên bản mới: ${remoteData.version} (Hiện tại: ${CURRENT_VERSION})`);
            console.log('Đang tải bản cập nhật...');

            const tempZipPath = path.join(projectRoot, 'update_temp.zip');
            await downloadFile(remoteData.downloadUrl, tempZipPath);

            console.log('Tải thành công. Đang tiến hành cài đặt bản cập nhật...');

            // Format paths for PowerShell (using forward slashes to avoid escape backslash issues)
            const formattedZipPath = tempZipPath.replace(/\\/g, '/');
            const formattedDestDir = projectRoot.replace(/\\/g, '/');
            const currentPid = process.pid;

            // PowerShell script to run in background after EXE exits
            const psCommand = `
                $ErrorActionPreference = 'Stop'
                try {
                    # Chờ tiến trình chính tắt hẳn
                    while (Get-Process -Id ${currentPid} -ErrorAction SilentlyContinue) {
                        Start-Sleep -Milliseconds 200
                    }
                    
                    $zipPath = '${formattedZipPath}'
                    $destDir = '${formattedDestDir}'
                    $extractDir = "$destDir/update_extract_temp"
                    
                    # Tạo thư mục giải nén tạm
                    if (Test-Path $extractDir) {
                        Remove-Item -Path $extractDir -Recurse -Force -ErrorAction SilentlyContinue
                    }
                    New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
                    
                    # Giải nén
                    Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
                    
                    # Tìm thư mục chứa files thực tế bên trong ZIP
                    $subDirs = Get-ChildItem -Path $extractDir -Directory
                    $sourcePath = $extractDir
                    if ($subDirs.Count -eq 1) {
                        $sourcePath = $subDirs[0].FullName
                    }
                    
                    # Sao chép đè tệp tin, bỏ qua file .env cấu hình cá nhân
                    Get-ChildItem -Path $sourcePath -Recurse | ForEach-Object {
                        $relativePath = $_.FullName.Substring($sourcePath.Length).TrimStart('\\').TrimStart('/')
                        if ($relativePath) {
                            $destFile = Join-Path $destDir $relativePath
                            if ($_.PsIsContainer) {
                                New-Item -ItemType Directory -Force -Path $destFile | Out-Null
                            } else {
                                if ($_.Name -ne '.env') {
                                    Copy-Item -Path $_.FullName -Destination $destFile -Force
                                }
                            }
                        }
                    }
                    
                    # Dọn dẹp tệp tạm
                    Remove-Item -Path $extractDir -Recurse -Force -ErrorAction SilentlyContinue
                    Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
                    
                    # Khởi động lại ứng dụng mới
                    $exePath = Join-Path $destDir 'pcastpro-backend.exe'
                    Start-Process -FilePath $exePath
                } catch {
                    # Ghi lỗi ra file log nếu xảy ra sự cố
                    $logFile = Join-Path '${formattedDestDir}' 'update_error.log'
                    $_.Exception.Message | Out-File -FilePath $logFile -Append
                }
            `.replace(/\r?\n/g, ' '); // Compress into single line for PowerShell -Command parameter

            // Spawn detached powershell process
            const child = spawn('powershell.exe', [
                '-NoProfile',
                '-NonInteractive',
                '-WindowStyle', 'Hidden',
                '-Command', psCommand
            ], {
                detached: true,
                stdio: 'ignore'
            });
            child.unref();

            console.log('Ứng dụng sẽ tự đóng để hoàn tất cập nhật...');
            process.exit(0);
        } else {
            console.log('PCastPro đã ở phiên bản mới nhất.');
        }
    } catch (error) {
        console.error('Không thể kiểm tra hoặc cài đặt cập nhật:', error.message);
    }
}

module.exports = {
    checkForUpdates
};
