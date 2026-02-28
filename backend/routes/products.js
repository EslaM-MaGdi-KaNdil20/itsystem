const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  exportToExcel,
  exportToPDF
} = require('../controllers/productsController');

router.get('/', getAllProducts);
router.get('/export/excel', exportToExcel);
router.get('/export/pdf', exportToPDF);
router.get('/low-stock', getLowStockProducts);
router.get('/:id', getProduct);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
