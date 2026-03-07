const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    action: {
        type: String,
        required: true,
        enum: [
            'reservation_created',
            'payment_initiated',
            'payment_failed',
            'reservation_confirmed',
            'reservation_cancelled',
            'review_posted',
            'restaurant_approved',
            'subscription_renewed',
            'menu_updated',
            'login',
            'profile_updated'
        ]
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: String,
    userAgent: String
}, { timestamps: true });

activityLogSchema.index({ action: 1 });
activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
