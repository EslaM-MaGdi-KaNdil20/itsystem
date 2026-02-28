const express = require('express');
const router = express.Router();
const devicesController = require('../controllers/devicesController');
const devicesPdfController = require('../controllers/devicesPdfController');
const devicesImportController = require('../controllers/devicesImportController');
const { authenticateToken } = require('../middleware/auth');

// Public route (no auth) — for QR code page
router.get('/public/:id', devicesController.getPublicInfo);

// Apply authentication to all routes
router.use(authenticateToken);

// Device types
router.get('/types', devicesController.getDeviceTypes);

// Device stats
router.get('/stats', devicesController.getStats);

// Import routes
router.get('/import/template', devicesImportController.getTemplate);
router.post('/import/preview', devicesImportController.uploadMiddleware, devicesImportController.previewImport);
router.post('/import/execute', devicesImportController.uploadMiddleware, devicesImportController.executeImport);

// Export routes
router.get('/export/excel', devicesController.exportToExcel);
router.get('/export/pdf', devicesPdfController.generateDevicesReportPDF);

// Device assignment
router.post('/assign', devicesController.assignDevice);
router.post('/return', devicesController.returnDevice);

// CRUD
router.get('/', devicesController.getAll);
router.get('/:id', devicesController.getById);
router.post('/', devicesController.create);
router.put('/:id', devicesController.update);
router.delete('/:id', devicesController.delete);

module.exports = router;
