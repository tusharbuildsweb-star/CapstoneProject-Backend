const express = require('express');
const router = express.Router();
const {
    createOrder,
    verifyPayment,
    handlePaymentFailure,
    webhook
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.post('/payment-failed', protect, handlePaymentFailure);
router.post('/webhook', webhook);

module.exports = router;
