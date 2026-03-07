const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    reservationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reservation'
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant'
    },
    type: {
        type: String,
        enum: ['Reservation', 'Subscription'],
        default: 'Reservation',
        required: true
    },
    razorpayOrderId: {
        type: String,
        required: true
    },
    razorpayPaymentId: {
        type: String
    },
    razorpaySignature: {
        type: String
    },
    paymentStatus: {
        type: String,
        enum: ['Created', 'Authorized', 'Captured', 'Failed', 'Refunded'],
        default: 'Created'
    },
    amount: {
        type: Number,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
