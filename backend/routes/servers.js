const express = require('express');
const router = express.Router();
const serversController = require('../controllers/serversController');

router.get('/stats', serversController.getServerStats);
router.get('/:id', serversController.getServerById);
router.get('/', serversController.getAllServers);
router.post('/', serversController.createServer);
router.put('/:id', serversController.updateServer);
router.delete('/:id', serversController.deleteServer);

module.exports = router;
