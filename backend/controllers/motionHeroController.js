const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const { projectRoot } = require('../config/pathHelper');

/**
 * In-memory store for session keys.
 * Map<string, { key: Buffer, expiresAt: number }>
 * Keyed by `userId:sessionId`
 */
const sessionKeyStore = new Map();

// Cleanup expired keys every 60 seconds
setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of sessionKeyStore) {
        if (now > entry.expiresAt) {
            sessionKeyStore.delete(id);
        }
    }
}, 60_000);

/**
 * GET /api/motion-hero/session-key
 * Generate and return a time-limited session key for client-side decryption.
 * The key is the MASTER KEY itself (needed by client to decrypt).
 * Protected by authenticateToken + checkPermission('motionhero').
 */
const getSessionKey = async (req, res) => {
    try {
        const { userId, sessionId } = req.user;
        const storeKey = `${userId}:${sessionId}`;
        const ttl = parseInt(process.env.MOTION_HERO_SESSION_TTL) || 300; // 5 minutes

        const masterKeyHex = process.env.MOTION_HERO_KEY;
        if (!masterKeyHex || masterKeyHex.length !== 64) {
            console.error('MOTION_HERO_KEY not configured or invalid');
            return res.status(500).send({
                success: false,
                message: 'Motion Hero chưa được cấu hình trên server'
            });
        }

        // Invalidate any previous key for this session
        sessionKeyStore.delete(storeKey);

        // Store new session entry
        const expiresAt = Date.now() + (ttl * 1000);
        sessionKeyStore.set(storeKey, {
            key: masterKeyHex,
            expiresAt
        });

        res.status(200).send({
            success: true,
            key: masterKeyHex,
            expiresIn: ttl
        });
    } catch (error) {
        console.error('Error generating session key:', error);
        res.status(500).send({
            success: false,
            message: 'Lỗi khi tạo session key'
        });
    }
};

/**
 * GET /api/motion-hero/stream/:heroName
 * Stream an encrypted .dat file for the specified hero.
 * Validates heroName to prevent path traversal.
 * Protected by authenticateToken + checkPermission('motionhero').
 */
const streamHeroVideo = async (req, res) => {
    try {
        const { heroName } = req.params;

        // Whitelist: only allow alphanumeric, apostrophe, and dash characters
        if (!heroName || !/^[a-zA-Z0-9'_-]+$/.test(heroName)) {
            return res.status(400).send({
                success: false,
                message: 'Tên tướng không hợp lệ'
            });
        }

        const datFilePath = path.join(
            projectRoot, 'frontend', 'images', 'heroMotion', 'encrypted', `${heroName}.dat`
        );

        // Check file exists
        if (!fs.existsSync(datFilePath)) {
            return res.status(404).send({
                success: false,
                message: `Không tìm thấy video motion cho tướng: ${heroName}`
            });
        }

        // Set security headers
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        // Do NOT set Content-Disposition to prevent download dialog

        // Stream the encrypted file
        const readStream = fs.createReadStream(datFilePath);
        readStream.on('error', (err) => {
            console.error(`Error streaming hero motion for ${heroName}:`, err);
            if (!res.headersSent) {
                res.status(500).send({
                    success: false,
                    message: 'Lỗi khi đọc file video motion'
                });
            }
        });

        readStream.pipe(res);
    } catch (error) {
        console.error('Error streaming hero video:', error);
        res.status(500).send({
            success: false,
            message: 'Lỗi server khi stream video'
        });
    }
};

/**
 * GET /api/motion-hero/check
 * Check if the active user has motionhero permission.
 * Only requires authenticateToken (no permission check).
 */
const checkMotionHeroPermission = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).send({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        const hasMotionHero = user.role === 'admin' ||
            (user.permissions && user.permissions.includes('motionhero'));

        res.status(200).send({
            success: true,
            hasMotionHero,
            motionHeroEnabled: user.motionHeroEnabled !== false
        });
    } catch (error) {
        console.error('Error checking motionhero permission:', error);
        res.status(500).send({
            success: false,
            message: 'Lỗi kiểm tra quyền motionhero'
        });
    }
};

/**
 * POST /api/motion-hero/toggle
 * Toggle or set motionHeroEnabled setting for the authenticated user.
 * Returns 403 error if user lacks motionhero permission.
 */
const toggleMotionHero = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).send({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        const hasPermission = user.role === 'admin' ||
            (user.permissions && user.permissions.includes('motionhero'));

        if (!hasPermission) {
            return res.status(403).send({
                success: false,
                hasPermission: false,
                message: 'Bạn chưa có quyền sử dụng tính năng Video Motion Hero!'
            });
        }

        // Toggle or set specified boolean state
        if (req.body.enabled !== undefined) {
            user.motionHeroEnabled = !!req.body.enabled;
        } else {
            user.motionHeroEnabled = !user.motionHeroEnabled;
        }

        await user.save();

        res.status(200).send({
            success: true,
            hasPermission: true,
            motionHeroEnabled: user.motionHeroEnabled,
            message: user.motionHeroEnabled 
                ? 'Đã bật Ảnh tướng động (Video Motion Hero)' 
                : 'Đã tắt Ảnh tướng động (Video Motion Hero)'
        });
    } catch (error) {
        console.error('Error toggling motionhero setting:', error);
        res.status(500).send({
            success: false,
            message: 'Lỗi khi cập nhật cài đặt Motion Hero'
        });
    }
};

module.exports = {
    getSessionKey,
    streamHeroVideo,
    checkMotionHeroPermission,
    toggleMotionHero
};

