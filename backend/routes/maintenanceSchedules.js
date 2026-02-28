const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/maintenanceSchedulesController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.post('/:id/mark-done', ctrl.markDone);
router.delete('/:id', ctrl.delete);

module.exports = router;
