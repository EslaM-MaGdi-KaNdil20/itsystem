const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ctrl = require('../controllers/notificationsController');

router.get('/unread-count', authenticateToken, ctrl.getUnreadCount);
router.get('/',             authenticateToken, ctrl.getAll);
router.put('/read-all',     authenticateToken, ctrl.markAllRead);
router.put('/:id/read',     authenticateToken, ctrl.markRead);
router.delete('/clear-read',authenticateToken, ctrl.clearRead);

module.exports = router;
