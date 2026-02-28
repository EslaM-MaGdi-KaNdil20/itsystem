const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const { authenticateToken, requireAuth } = require('../middleware/auth');

// Config
router.get('/config', requireAuth, adController.getConfig);
router.post('/config', requireAuth, adController.saveConfig);
router.post('/test-connection', requireAuth, adController.testConnection);

// Sync & Fetch
router.post('/sync', requireAuth, adController.syncADUsers);
router.get('/fetch-users', requireAuth, adController.fetchADUsers);

// Local AD cache
router.get('/users', requireAuth, adController.getADUsers);
router.get('/stats', requireAuth, adController.getStats);
router.get('/sync-logs', requireAuth, adController.getSyncLogs);

// Create local users/employees from AD
router.post('/create-user', requireAuth, adController.createUserFromAD);
router.post('/create-employee', requireAuth, adController.createEmployeeFromAD);
router.post('/bulk-create-users', requireAuth, adController.bulkCreateUsers);
router.post('/bulk-create-employees', requireAuth, adController.bulkCreateEmployees);
router.get('/preview-employee/:ad_user_id', requireAuth, adController.previewEmployeeAutoLink);

// Unlink
router.put('/unlink/:id', requireAuth, adController.unlinkADUser);

// OUs & Groups (Departments sync)
router.get('/fetch-ous', requireAuth, adController.fetchADOUs);
router.get('/fetch-groups', requireAuth, adController.fetchADGroups);
router.post('/sync-as-departments', requireAuth, adController.syncAsDepartments);
router.get('/groups-ous', requireAuth, adController.getADGroupsOUs);
router.post('/fix-employee-departments', requireAuth, adController.fixEmployeeDepartments);

module.exports = router;
