const express = require('express');
const router = express.Router();
const {
  getActivityLogs,
  getActivityStats,
  getRecentActivities,
  clearOldLogs
} = require('../controllers/activityLogController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Get all activity logs with pagination and filters
router.get('/', getActivityLogs);

// Get activity statistics
router.get('/stats', getActivityStats);

// Get recent activities for dashboard
router.get('/recent', getRecentActivities);

// Clear old logs (admin only)
router.delete('/clear', clearOldLogs);

module.exports = router;
