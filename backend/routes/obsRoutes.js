const express = require('express');
const router = express.Router();
const obsController = require('../controllers/obsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/obs/:page', obsController.serveOBSPage);
router.get('/api/obs/config', authenticateToken, obsController.getOBSConfig);
router.post('/api/obs/config', authenticateToken, obsController.saveOBSConfig);
router.post('/api/obs/latest-file', authenticateToken, obsController.getLatestFile);

module.exports = router;
