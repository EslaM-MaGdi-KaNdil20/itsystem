const express = require('express');
const router = express.Router();
const slaController = require('../controllers/slaController');
const { authenticateToken } = require('../middleware/auth');

// All SLA routes require authentication
router.get('/policies', authenticateToken, slaController.getAllPolicies);
router.put('/policies/:id', authenticateToken, slaController.updatePolicy);
router.get('/stats', authenticateToken, slaController.getStats);
router.get('/breaches', authenticateToken, slaController.getBreaches);

module.exports = router;
