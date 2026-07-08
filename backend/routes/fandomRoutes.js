const express = require('express');
const router = express.Router();
const fandomController = require('../controllers/fandomController');
const { authenticateToken, checkPermission } = require('../middleware/auth');

router.get('/api/fandomwar/gifts', authenticateToken, checkPermission('fandomwar'), fandomController.getGifts);
router.post('/api/fandomwar/connect', authenticateToken, checkPermission('fandomwar'), fandomController.connectTikTok);
router.post('/api/fandomwar/disconnect', authenticateToken, checkPermission('fandomwar'), fandomController.disconnectTikTok);
router.get('/api/fandomwar/status', authenticateToken, checkPermission('fandomwar'), fandomController.getStatus);
router.post('/api/fandomwar/facebook/connect', authenticateToken, checkPermission('fandomwar'), fandomController.connectFacebook);
router.post('/api/fandomwar/facebook/disconnect', authenticateToken, checkPermission('fandomwar'), fandomController.disconnectFacebook);

module.exports = router;
