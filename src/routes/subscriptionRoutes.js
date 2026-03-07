const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const subscriptionController = require('../controllers/subscriptionController');

router.post('/order', protect, restrictTo('owner'), subscriptionController.createSubscriptionOrder);
router.post('/verify', protect, restrictTo('owner'), subscriptionController.verifySubscriptionPayment);
router.get('/history/:restaurantId', protect, restrictTo('owner'), subscriptionController.getSubscriptionHistory);

module.exports = router;
