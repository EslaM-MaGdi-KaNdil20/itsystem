const express = require('express');
const router = express.Router();
const { generateAssignmentPDF } = require('../controllers/pdfController');

// Generate Assignment PDF
router.post('/assignment', generateAssignmentPDF);

module.exports = router;
