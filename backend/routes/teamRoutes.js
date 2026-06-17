const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');

router.get('/api/get-team-info', teamController.getTeamInfo);
router.post('/api/save-team-info', teamController.saveTeamInfo);

module.exports = router;
