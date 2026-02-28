const express = require('express');
const router = express.Router();
const assignmentsExport = require('../controllers/assignmentsExport');
const assignmentsPdfController = require('../controllers/assignmentsPdfController');

// Export routes
router.get('/export/excel', assignmentsExport.exportToExcel);
router.get('/export/pdf', assignmentsPdfController.generateAssignmentsReportPDF);

module.exports = router;
