const express = require('express');
const router = express.Router();
const {
  addStockMovement,
  getStockMovements,
  getInventorySummary
} = require('../controllers/inventoryController');

router.post('/movement', addStockMovement);
router.get('/movements', getStockMovements);
router.get('/summary', getInventorySummary);

module.exports = router;
