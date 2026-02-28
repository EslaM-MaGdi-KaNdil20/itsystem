const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { generateMaintenancePDF } = require('../controllers/maintenancePdfController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Stats and reports
router.get('/stats', maintenanceController.getStats);
router.get('/monthly-report', maintenanceController.getMonthlyReport);
router.get('/export/pdf', generateMaintenancePDF);

// CRUD
router.get('/', maintenanceController.getAll);
router.get('/:id', maintenanceController.getById);
router.post('/', maintenanceController.create);
router.put('/:id', maintenanceController.update);
router.delete('/:id', maintenanceController.delete);

module.exports = router;
