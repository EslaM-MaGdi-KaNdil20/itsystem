const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/licensesController');
const { authenticateToken } = require('../middleware/auth');

// Stats must come before /:id
router.get('/stats', authenticateToken, ctrl.getStats);
router.get('/employee/:employee_id', authenticateToken, ctrl.getEmployeeLicenses);

// Licenses CRUD
router.get('/',       authenticateToken, ctrl.getAll);
router.get('/:id',    authenticateToken, ctrl.getById);
router.post('/',      authenticateToken, ctrl.create);
router.put('/:id',    authenticateToken, ctrl.update);
router.delete('/:id', authenticateToken, ctrl.deleteLicense);

// Assignments
router.post('/assignments/assign',         authenticateToken, ctrl.assign);
router.put('/assignments/:id/revoke',      authenticateToken, ctrl.revokeAssignment);
router.delete('/assignments/:id',          authenticateToken, ctrl.deleteAssignment);

module.exports = router;
