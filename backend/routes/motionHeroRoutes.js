const express = require('express');
const router = express.Router();
const motionHeroController = require('../controllers/motionHeroController');
const { authenticateToken, checkPermission } = require('../middleware/auth');

// Get a time-limited session key for decrypting hero motion videos
router.get(['/api/motion-hero/session-key', '/motion-hero/session-key'],
    authenticateToken,
    checkPermission('motionhero'),
    motionHeroController.getSessionKey
);

// Stream an encrypted hero motion .dat file
router.get(['/api/motion-hero/stream/:heroName', '/motion-hero/stream/:heroName'],
    authenticateToken,
    checkPermission('motionhero'),
    motionHeroController.streamHeroVideo
);

// Check if the current user has motionhero permission & status
router.get(['/api/motion-hero/check', '/motion-hero/check'],
    authenticateToken,
    motionHeroController.checkMotionHeroPermission
);

// Toggle motion hero enabled setting for current user
router.post(['/api/motion-hero/toggle', '/motion-hero/toggle'],
    authenticateToken,
    motionHeroController.toggleMotionHero
);

module.exports = router;
