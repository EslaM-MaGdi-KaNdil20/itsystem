const express = require('express');
const router = express.Router();
const departmentsController = require('../controllers/departmentsController');
const departmentsExport = require('../controllers/departmentsExport');
const departmentsImport = require('../controllers/departmentsImportController');

// Export routes
router.get('/export/excel', departmentsExport.exportToExcel);

// Import routes
router.get('/import/template', departmentsImport.getTemplate);
router.post('/import/preview', departmentsImport.uploadMiddleware, departmentsImport.previewImport);
router.post('/import/execute', departmentsImport.uploadMiddleware, departmentsImport.executeImport);

// CRUD routes
router.get('/', departmentsController.getAll);
router.get('/:id', departmentsController.getById);
router.post('/', departmentsController.create);
router.put('/:id', departmentsController.update);
router.delete('/:id', departmentsController.delete);

module.exports = router;
