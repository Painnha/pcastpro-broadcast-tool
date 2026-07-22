/**
 * generate-manifest.js
 * 
 * Tool to scan encrypted Motion Hero asset files (.dat) in `frontend/images/heroMotion/encrypted/`,
 * calculate their SHA-256 hashes and file sizes, and output a production-ready `manifest.json`.
 * 
 * Usage: node scripts/generate-manifest.js [version]
 * Example: node scripts/generate-manifest.js 2.3.0
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Resolve project root
const projectRoot = path.resolve(__dirname, '..');

// Try reading current version from updateService.js
let version = '2.2.2';
try {
    const updateServicePath = path.join(projectRoot, 'backend', 'services', 'updateService.js');
    if (fs.existsSync(updateServicePath)) {
        const content = fs.readFileSync(updateServicePath, 'utf8');
        const match = content.match(/const\s+CURRENT_VERSION\s*=\s*['"]([^'"]+)['"]/);
        if (match && match[1]) {
            version = match[1];
        }
    }
} catch (e) {
    console.warn('⚠️ Could not auto-detect version from updateService.js, defaulting to:', version);
}

// Override version if passed via CLI argument
if (process.argv[2]) {
    version = process.argv[2];
}

const ASSET_DIR = path.join(projectRoot, 'frontend', 'images', 'heroMotion', 'encrypted');
const MANIFEST_PATH = path.join(projectRoot, 'manifest.json');

/**
 * Compute SHA-256 hash of a file
 */
function computeFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', data => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

async function generateManifest() {
    console.log('====================================================');
    console.log('🚀 PCastPro Manifest Generator');
    console.log(`📌 App Version : v${version}`);
    console.log(`📁 Asset Dir   : ${ASSET_DIR}`);
    console.log('====================================================\n');

    if (!fs.existsSync(ASSET_DIR)) {
        console.error(`❌ Asset directory does not exist: ${ASSET_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(ASSET_DIR).filter(file => file.endsWith('.dat'));
    console.log(`🔍 Found ${files.length} .dat files. Generating SHA-256 hashes...\n`);

    const assets = [];
    let totalBytes = 0;
    let count = 0;

    for (const file of files) {
        count++;
        const fullPath = path.join(ASSET_DIR, file);
        const stats = fs.statSync(fullPath);
        const hash = await computeFileHash(fullPath);
        
        // Relative path normalized to forward slashes for cross-platform manifest
        const relativePath = `frontend/images/heroMotion/encrypted/${file}`;

        assets.push({
            path: relativePath,
            hash: hash,
            size: stats.size
        });

        totalBytes += stats.size;
        const percent = Math.round((count / files.length) * 100);
        process.stdout.write(`\r  [${percent}%] (${count}/${files.length}) Processed ${file} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
    }

    console.log('\n');

    const manifestData = {
        version: version,
        releaseNotes: `PCastPro Release v${version} - Unified Delta Updater & Motion Hero Assets`,
        updatedAt: new Date().toISOString(),
        coreDownloadUrl: `https://pcastpro.nguyentriphong.id.vn/downloads/PCastPro-v${version}.zip`,
        assetsBaseUrl: `https://github.com/Painnha/pcastpro-broadcast-tool/releases/download/v${version}/`,
        totalAssets: assets.length,
        totalSizeBytes: totalBytes,
        totalSizeMB: (totalBytes / (1024 * 1024)).toFixed(2),
        assets: assets
    };

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifestData, null, 2), 'utf8');

    console.log('====================================================');
    console.log('✅ Manifest successfully generated!');
    console.log(`📄 Saved to     : ${MANIFEST_PATH}`);
    console.log(`📊 Total Assets : ${assets.length} files`);
    console.log(`📦 Total Size   : ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
    console.log('====================================================');
}

generateManifest().catch(err => {
    console.error('❌ Failed to generate manifest:', err);
    process.exit(1);
});
