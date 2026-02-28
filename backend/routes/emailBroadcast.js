const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/emailBroadcastController');
const { authenticateToken } = require('../middleware/auth');

router.get('/recipients', authenticateToken, ctrl.getRecipients);
router.get('/departments', authenticateToken, ctrl.getDepartments);
router.get('/history', authenticateToken, ctrl.getHistory);
router.post('/send', authenticateToken, ctrl.sendBroadcast);

module.exports = router;
