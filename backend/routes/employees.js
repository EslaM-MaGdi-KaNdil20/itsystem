const express = require('express');
const router = express.Router();
const employeesController = require('../controllers/employeesController');
const employeesExport = require('../controllers/employeesExport');
const employeesPdfController = require('../controllers/employeesPdfController');
const employeesImport = require('../controllers/employeesImportController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Export routes
router.get('/export/excel', employeesExport.exportToExcel);
router.get('/export/pdf', employeesPdfController.generateEmployeesReportPDF);

// Import routes
router.get('/import/template', employeesImport.getTemplate);
router.post('/import/preview', employeesImport.uploadMiddleware, employeesImport.previewImport);
router.post('/import/execute', employeesImport.uploadMiddleware, employeesImport.executeImport);

// CRUD routes
router.get('/:id/profile', employeesController.getProfile);
router.get('/', employeesController.getAll);
router.get('/:id', employeesController.getById);
router.post('/', employeesController.create);
router.put('/:id', employeesController.update);
router.delete('/:id', employeesController.delete);

module.exports = router;
