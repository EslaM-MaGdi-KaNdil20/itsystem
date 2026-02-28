const express = require('express');
const router = express.Router();
const stockController = require('../controllers/accessoryStockController');

// Export routes
router.get('/export/excel', stockController.exportToExcel);
router.get('/export/pdf', stockController.exportToPDF);

// Accessory types CRUD
router.post('/', stockController.createAccessory);
router.put('/:id', stockController.updateAccessory);
router.delete('/:id', stockController.deleteAccessory);

// Stock management
router.get('/stock', stockController.getAllWithStock);
router.get('/stock/summary', stockController.getStockSummary);
router.put('/stock/:id', stockController.updateStock);
router.get('/stock/movements', stockController.getStockMovements);

// Standalone accessory assignments
router.get('/assignments', stockController.getAssignments);
router.get('/assignments/employee/:employeeId', stockController.getByEmployee);
router.post('/assign', stockController.assignToEmployee);
router.put('/return/:id', stockController.returnAccessory);

module.exports = router;
