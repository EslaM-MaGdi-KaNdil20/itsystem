const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendanceController');

// Devices
router.get('/devices', ctrl.getDevices);
router.post('/devices', ctrl.addDevice);
router.put('/devices/:id', ctrl.updateDevice);
router.delete('/devices/:id', ctrl.deleteDevice);
router.post('/devices/test', ctrl.testConnection);

// Sync
router.post('/devices/:device_id/sync-users', ctrl.syncUsers);
router.post('/devices/:device_id/sync-attendance', ctrl.syncAttendance);

// Mappings
router.get('/devices/:device_id/mappings', ctrl.getMappings);
router.put('/mappings/:mapping_id', ctrl.mapUser);
router.post('/bulk-sync-codes', ctrl.bulkSyncCodes);

// Attendance data
router.get('/logs', ctrl.getAttendance);
router.get('/stats', ctrl.getAttendanceStats);
router.get('/daily-report', ctrl.getDailyReport);

module.exports = router;
