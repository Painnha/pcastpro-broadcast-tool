const express = require('express');
const router = express.Router();
const obsController = require('../controllers/obsController');
const { authenticateToken, checkPermission } = require('../middleware/auth');

router.get('/obs/:page', obsController.serveOBSPage);
router.get('/api/obs/config', authenticateToken, checkPermission('quanlyobs'), obsController.getOBSConfig);
router.post('/api/obs/config', authenticateToken, checkPermission('quanlyobs'), obsController.saveOBSConfig);
router.post('/api/obs/latest-file', authenticateToken, checkPermission('quanlyobs'), obsController.getLatestFile);

module.exports = router;
