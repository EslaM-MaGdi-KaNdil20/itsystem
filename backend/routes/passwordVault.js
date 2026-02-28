const express = require('express');
const router = express.Router();
const passwordVaultController = require('../controllers/passwordVaultController');

router.get('/stats', passwordVaultController.getPasswordStats);
router.get('/categories', passwordVaultController.getCategories);
router.get('/:id', passwordVaultController.getPasswordById);
router.get('/', passwordVaultController.getAllPasswords);
router.post('/', passwordVaultController.createPassword);
router.put('/:id', passwordVaultController.updatePassword);
router.delete('/:id', passwordVaultController.deletePassword);

module.exports = router;
