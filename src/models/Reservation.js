const mongoose = require('mongoose');

const preorderItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, default: 1 }
}, { _id: false });

const reservationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        required: true
    },
    // Denormalised user info for quick display in owner/admin dashboards
    userName: { type: String, default: '' },
    userEmail: { type: String, default: '' },
    selectedPackage: {
        packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
        title: { type: String },
        totalCost: { type: Number }
    },
    slotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TimeSlot'
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    bookingDateTime: {
        type: Date
    },
    guests: {
        type: Number,
        required: true
    },
    tableSize: {
        type: String,
        enum: ['2-seater', '4-seater', '6-seater', 'group'],
        default: '4-seater'
    },
    // Billing
    preorderItems: [preorderItemSchema],
    advancePaid: { type: Number, default: 0 },       // ₹200 per table advance
    platformFee: { type: Number, default: 0 },        // 10% of advance
    preorderTotal: { type: Number, default: 0 },      // sum of preorder items
    totalPaidNow: { type: Number, default: 0 },       // advance + package + preorder
    remainingAmount: { type: Number, default: 0 },    // payable at restaurant
    // Lock
    lockExpiresAt: { type: Date },                    // 5-min window for payment
    status: {
        type: String,
        enum: ['draft', 'payment_initiated', 'payment_failed', 'confirmed', 'cancelled', 'completed'],
        default: 'payment_initiated'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
        default: 'Pending'
    },
    razorpayOrderId: { type: String }
}, { timestamps: true });

reservationSchema.index({ userId: 1 });
reservationSchema.index({ restaurantId: 1 });
// ownerId index is already created in the schema definition
reservationSchema.index({ status: 1 });
reservationSchema.index({ bookingDateTime: 1 });
reservationSchema.index({ userEmail: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
