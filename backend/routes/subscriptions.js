const express = require('express');
const router = express.Router();
const subscriptionsController = require('../controllers/subscriptionsController');
const subscriptionsPdfController = require('../controllers/subscriptionsPdfController');

router.get('/export/pdf', subscriptionsPdfController.generateSubscriptionsPDF);
router.get('/stats', subscriptionsController.getSubscriptionStats);
router.get('/expiring', subscriptionsController.getExpiringSubscriptions);
router.get('/:id', subscriptionsController.getSubscriptionById);
router.get('/', subscriptionsController.getAllSubscriptions);
router.post('/', subscriptionsController.createSubscription);
router.put('/:id', subscriptionsController.updateSubscription);
router.delete('/:id', subscriptionsController.deleteSubscription);

module.exports = router;
