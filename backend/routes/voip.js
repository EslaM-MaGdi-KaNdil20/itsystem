const express = require('express');
const router = express.Router();
const voipController = require('../controllers/voipController');
const { requireAuth } = require('../middleware/auth');

// Config
router.get('/config', requireAuth, voipController.getConfig);
router.post('/config', requireAuth, voipController.saveConfig);

// Connection
router.post('/test-connection', requireAuth, voipController.testConnection);

// Sync
router.post('/sync-extensions', requireAuth, voipController.syncExtensions);

// Extensions
router.get('/extensions', requireAuth, voipController.getExtensions);
router.put('/extensions/:id/link', requireAuth, voipController.linkExtension);
router.delete('/extensions/:id', requireAuth, voipController.deleteExtension);

// Stats & Logs
router.get('/stats', requireAuth, voipController.getStats);
router.get('/sync-logs', requireAuth, voipController.getSyncLogs);

module.exports = router;
