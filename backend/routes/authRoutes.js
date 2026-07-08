const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/login', authController.login);
router.get('/check-session', authController.checkSession);
router.post('/api/admin/assign-permissions', authenticateToken, authController.assignPermissions);

module.exports = router;
