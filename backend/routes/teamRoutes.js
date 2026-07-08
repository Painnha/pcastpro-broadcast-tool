const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticateToken, checkPermission } = require('../middleware/auth');

router.get('/api/get-team-info', authenticateToken, checkPermission('basic'), teamController.getTeamInfo);
router.post('/api/save-team-info', authenticateToken, checkPermission('basic'), teamController.saveTeamInfo);

module.exports = router;
