const express = require('express');
const router = express.Router();
const emailAccountsController = require('../controllers/emailAccountsController');
const { requireAuth } = require('../middleware/auth');

router.get('/stats', emailAccountsController.getEmailStats);
router.get('/departments', emailAccountsController.getDepartments);
router.post('/auto-link', requireAuth, emailAccountsController.autoLinkAll);
router.put('/:id/link', requireAuth, emailAccountsController.linkEmployee);
router.delete('/:id/link', requireAuth, emailAccountsController.unlinkEmployee);
router.get('/:id', emailAccountsController.getEmailAccountById);
router.get('/', emailAccountsController.getAllEmailAccounts);
router.post('/', emailAccountsController.createEmailAccount);
router.put('/:id', emailAccountsController.updateEmailAccount);
router.delete('/:id', emailAccountsController.deleteEmailAccount);

module.exports = router;
