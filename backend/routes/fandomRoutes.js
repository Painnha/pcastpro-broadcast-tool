const express = require('express');
const router = express.Router();
const fandomController = require('../controllers/fandomController');
const { authenticateToken } = require('../middleware/auth');

router.get('/api/fandomwar/gifts', authenticateToken, fandomController.getGifts);
router.post('/api/fandomwar/connect', authenticateToken, fandomController.connectTikTok);
router.post('/api/fandomwar/disconnect', authenticateToken, fandomController.disconnectTikTok);
router.get('/api/fandomwar/status', authenticateToken, fandomController.getStatus);
router.post('/api/fandomwar/facebook/connect', authenticateToken, fandomController.connectFacebook);
router.post('/api/fandomwar/facebook/disconnect', authenticateToken, fandomController.disconnectFacebook);

module.exports = router;
