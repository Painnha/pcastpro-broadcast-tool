/**
 * encryptHeroMotion.js
 * 
 * CLI script to encrypt all hero motion .mp4 files into .dat format
 * using AES-256-GCM encryption.
 * 
 * Usage: node scripts/encryptHeroMotion.js
 * 
 * Reads MOTION_HERO_KEY from .env file.
 * Input:  frontend/images/heroMotion/*.mp4
 * Output: frontend/images/heroMotion/encrypted/<heroName>.dat
 * Format: [12 bytes IV][16 bytes AuthTag][...Ciphertext...]
 * 
 * IMPORTANT: This script does NOT delete original .mp4 files.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load .env from project root or backend folder
const projectRoot = path.resolve(__dirname, '..');
const envPathRoot = path.join(projectRoot, '.env');
const envPathBackend = path.join(projectRoot, 'backend', '.env');

// Resolve dotenv from backend/node_modules since script runs from scripts/
const dotenvPath = path.join(projectRoot, 'backend', 'node_modules', 'dotenv');
const dotenv = require(dotenvPath);

if (fs.existsSync(envPathRoot)) {
    dotenv.config({ path: envPathRoot });
} else if (fs.existsSync(envPathBackend)) {
    dotenv.config({ path: envPathBackend });
} else {
    console.error('❌ No .env file found. Please create one with MOTION_HERO_KEY.');
    process.exit(1);
}

const MASTER_KEY_HEX = process.env.MOTION_HERO_KEY;

if (!MASTER_KEY_HEX || MASTER_KEY_HEX.length !== 64) {
    console.error('❌ MOTION_HERO_KEY must be a 64-character hex string (32 bytes).');
    console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
}

const MASTER_KEY = Buffer.from(MASTER_KEY_HEX, 'hex');
const SOURCE_DIR = path.join(projectRoot, 'frontend', 'images', 'heroMotion');
const OUTPUT_DIR = path.join(SOURCE_DIR, 'encrypted');

function encryptFile(inputPath, outputPath) {
    const plaintext = fs.readFileSync(inputPath);

    // Generate random 12-byte IV for each file
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag(); // 16 bytes

    // Output format: [IV 12B][AuthTag 16B][Ciphertext...]
    const output = Buffer.concat([iv, authTag, ciphertext]);
    fs.writeFileSync(outputPath, output);

    return {
        inputSize: plaintext.length,
        outputSize: output.length
    };
}

function main() {
    console.log('');
    console.log('  ================================================');
    console.log('   PCastPro — Hero Motion Encryption Tool');
    console.log('  ================================================');
    console.log('');
    console.log(`  Source : ${SOURCE_DIR}`);
    console.log(`  Output : ${OUTPUT_DIR}`);
    console.log('');

    // Check source directory exists
    if (!fs.existsSync(SOURCE_DIR)) {
        console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
        process.exit(1);
    }

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`  📁 Created output directory: ${OUTPUT_DIR}`);
    }

    // Scan for .mp4 files
    const mp4Files = fs.readdirSync(SOURCE_DIR)
        .filter(f => f.toLowerCase().endsWith('.mp4') && fs.statSync(path.join(SOURCE_DIR, f)).isFile());

    if (mp4Files.length === 0) {
        console.error('❌ No .mp4 files found in source directory.');
        process.exit(1);
    }

    console.log(`  🔍 Found ${mp4Files.length} .mp4 files to encrypt.`);
    console.log('');

    let successCount = 0;
    let failCount = 0;
    let totalInputSize = 0;
    let totalOutputSize = 0;

    for (const mp4File of mp4Files) {
        const heroName = path.basename(mp4File, '.mp4');
        const inputPath = path.join(SOURCE_DIR, mp4File);
        const outputPath = path.join(OUTPUT_DIR, `${heroName}.dat`);

        try {
            const result = encryptFile(inputPath, outputPath);
            totalInputSize += result.inputSize;
            totalOutputSize += result.outputSize;
            successCount++;

            const sizeMB = (result.inputSize / (1024 * 1024)).toFixed(1);
            console.log(`  ✅ ${heroName.padEnd(20)} ${sizeMB} MB → ${path.basename(outputPath)}`);
        } catch (err) {
            failCount++;
            console.error(`  ❌ ${heroName.padEnd(20)} ERROR: ${err.message}`);
        }
    }

    console.log('');
    console.log('  ================================================');
    console.log(`  ✅ Success: ${successCount} files`);
    if (failCount > 0) {
        console.log(`  ❌ Failed : ${failCount} files`);
    }
    console.log(`  📦 Total input  : ${(totalInputSize / (1024 * 1024)).toFixed(1)} MB`);
    console.log(`  📦 Total output : ${(totalOutputSize / (1024 * 1024)).toFixed(1)} MB`);
    console.log(`  🔐 Encryption   : AES-256-GCM`);
    console.log(`  📝 Format       : [IV 12B][AuthTag 16B][Ciphertext]`);
    console.log('');
    console.log('  ⚠️  Original .mp4 files have NOT been deleted.');
    console.log('  ================================================');
    console.log('');
}

main();
