const Razorpay = require('razorpay');
const crypto = require('crypto');
const Restaurant = require('../models/Restaurant');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const { logActivity } = require('../utils/activityLogger');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const createSubscriptionOrder = async (req, res, next) => {
    try {
        const { restaurantId } = req.body;
        const amount = 1000 * 100; // ₹1000 in paise

        const options = {
            amount,
            currency: "INR",
            receipt: `sub_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        next(error);
    }
};

const verifySubscriptionPayment = async (req, res, next) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            restaurantId
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Invalid signature" });
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) throw new Error('Restaurant not found');

        const now = new Date();
        let expiry;

        // Advance Payment Logic: if current expiry in future, add 30 days to it
        if (restaurant.subscriptionExpiresAt && restaurant.subscriptionExpiresAt > now) {
            expiry = new Date(restaurant.subscriptionExpiresAt);
            expiry.setDate(expiry.getDate() + 30);
        } else {
            expiry = new Date(now);
            expiry.setDate(expiry.getDate() + 30);
        }

        restaurant.subscriptionStatus = 'active';
        restaurant.subscriptionExpiresAt = expiry;
        restaurant.lastSubscriptionRenewal = now;
        restaurant.subscriptionPaymentId = razorpay_payment_id;
        await restaurant.save();

        // Save Subscription Record
        await Subscription.create({
            restaurantId,
            ownerId: req.user._id,
            amount: 1000,
            endDate: expiry,
            status: 'Active',
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id
        });

        // Save generic Payment record for history
        await Payment.create({
            restaurantId,
            ownerId: req.user._id,
            type: 'Subscription',
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            paymentStatus: 'Captured',
            amount: 1000
        });

        await logActivity(req.user._id, 'subscription_renewed', { restaurantId, amount: 1000 });

        if (global.io) {
            global.io.emit('globalUpdate', { type: 'subscription_renewed', restaurantId });
        }

        res.status(200).json({ success: true, message: "Subscription active" });
    } catch (error) {
        next(error);
    }
};

const getSubscriptionHistory = async (req, res, next) => {
    try {
        const { restaurantId } = req.params;
        const history = await Payment.find({
            restaurantId,
            type: 'Subscription',
            paymentStatus: 'Captured'
        }).sort({ createdAt: -1 });

        res.status(200).json(history);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createSubscriptionOrder,
    verifySubscriptionPayment,
    getSubscriptionHistory
};
