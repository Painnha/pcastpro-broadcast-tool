const express = require('express');
const router = express.Router();
const themeController = require('../controllers/themeController');
const { authenticateToken } = require('../middleware/auth');

router.put('/user/update-theme', authenticateToken, themeController.updateTheme);
router.get('/api/themes', themeController.getThemes);
router.get('/init-themes', themeController.initThemes);
router.post('/api/admin/assign-theme', authenticateToken, themeController.assignTheme);
router.get('/api/admin/migrate-users', themeController.migrateUsers);

module.exports = router;
