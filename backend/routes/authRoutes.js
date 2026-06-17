const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/login', authController.login);
router.get('/check-session', authController.checkSession);

module.exports = router;
