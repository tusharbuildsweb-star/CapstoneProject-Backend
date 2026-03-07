const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    planName: {
        type: String,
        default: 'Weekly Premium'
    },
    amount: {
        type: Number,
        required: true,
        default: 199
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Cancelled', 'Pending'],
        default: 'Pending'
    },
    razorpayOrderId: String,
    razorpayPaymentId: String
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
