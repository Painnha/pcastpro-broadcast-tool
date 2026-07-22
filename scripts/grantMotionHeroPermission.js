/**
 * grantMotionHeroPermission.js
 * 
 * Script to grant the 'motionhero' permission to a specific user account.
 * Target account: triphong2002@gmail.com
 * 
 * Usage: node scripts/grantMotionHeroPermission.js
 */

const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const envPathRoot = path.join(projectRoot, '.env');
const envPathBackend = path.join(projectRoot, 'backend', '.env');

// Resolve dotenv from backend/node_modules
const dotenvPath = path.join(projectRoot, 'backend', 'node_modules', 'dotenv');
const dotenv = require(dotenvPath);

if (fs.existsSync(envPathRoot)) {
    dotenv.config({ path: envPathRoot });
} else if (fs.existsSync(envPathBackend)) {
    dotenv.config({ path: envPathBackend });
}

const mongoosePath = path.join(projectRoot, 'backend', 'node_modules', 'mongoose');
const mongoose = require(mongoosePath);

const User = require(path.join(projectRoot, 'backend', 'models', 'User'));

const TARGET_EMAIL = 'triphong2002@gmail.com';
const dbURI = process.env.MONGODB_URI || 'mongodb+srv://PCasthub:Phong113%40@cluster0.5gzj7am.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function grantPermission() {
    console.log('');
    console.log('================================================');
    console.log(' PCastPro — Grant Permission Tool');
    console.log('================================================');
    console.log(`Connecting to MongoDB...`);

    try {
        await mongoose.connect(dbURI);
        console.log('Connected to MongoDB successfully.');

        const user = await User.findOne({ email: TARGET_EMAIL });

        if (!user) {
            console.error(`❌ User with email "${TARGET_EMAIL}" not found in database.`);
            process.exit(1);
        }

        console.log(`User found: ${user.email} (ID: ${user._id})`);
        console.log(`Current permissions:`, user.permissions || []);

        if (!user.permissions) {
            user.permissions = [];
        }

        if (!user.permissions.includes('motionhero')) {
            user.permissions.push('motionhero');
            console.log(`+ Added 'motionhero' to permissions.`);
        } else {
            console.log(`ℹ️ User already has 'motionhero' permission.`);
        }

        // Also enable motionHeroEnabled by default for this user
        user.motionHeroEnabled = true;

        await user.save();

        console.log('');
        console.log(`✅ SUCCESS! Updated permissions for ${user.email}:`);
        console.log(`   Permissions:`, user.permissions);
        console.log(`   Motion Hero Enabled:`, user.motionHeroEnabled);
        console.log('================================================');
        console.log('');
    } catch (err) {
        console.error('❌ Error updating user permission:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

grantPermission();
