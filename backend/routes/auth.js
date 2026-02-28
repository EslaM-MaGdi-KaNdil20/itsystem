const express = require('express');
const router = express.Router();
const { login, updateProfile, changePassword, getProfile, uploadAvatar } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/login', login);

// Profile routes (protected)
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);
router.post('/avatar', authenticateToken, ...uploadAvatar);

module.exports = router;
