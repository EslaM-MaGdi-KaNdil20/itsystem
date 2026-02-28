const express = require('express');
const router = express.Router();
const hostingController = require('../controllers/hostingController');
const { requireAuth } = require('../middleware/auth');

// Config
router.get('/config', requireAuth, hostingController.getConfig);
router.post('/config', requireAuth, hostingController.saveConfig);

// Connection
router.post('/test-connection', requireAuth, hostingController.testConnection);

// Domains
router.get('/domains', requireAuth, hostingController.listDomains);

// Sync
router.post('/sync-emails', requireAuth, hostingController.syncEmails);

// Stats & Logs
router.get('/stats', requireAuth, hostingController.getStats);
router.get('/sync-logs', requireAuth, hostingController.getSyncLogs);

module.exports = router;
