const express = require('express');
const router = express.Router();
const networkIPsController = require('../controllers/networkIPsController');

router.get('/stats', networkIPsController.getIPStats);
router.get('/:id', networkIPsController.getIPById);
router.get('/', networkIPsController.getAllIPs);
router.post('/', networkIPsController.createIP);
router.put('/:id', networkIPsController.updateIP);
router.delete('/:id', networkIPsController.deleteIP);

module.exports = router;
