const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    cuisine: {
        type: String,
        required: true
    },
    contactNumber: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    city: {
        type: String,
        default: 'Chennai'
    },
    ambienceTags: [{
        type: String
    }],
    workingHours: {
        type: mongoose.Schema.Types.Mixed,
        default: {
            weekday: '11:00 AM - 11:00 PM',
            weekend: '10:00 AM - 12:00 AM'
        }
    },
    priceRange: {
        type: String,
        enum: ['₹', '₹₹', '₹₹₹', '₹₹₹₹']
    },
    rating: {
        type: Number,
        default: 0
    },
    crowdLevel: {
        type: String,
        enum: ['Quiet', 'Normal', 'Busy'],
        default: 'Normal'
    },
    images: [{
        type: String
    }],
    isApproved: {
        type: Boolean,
        default: false
    },
    tables: {
        type: Number,
        required: true,
        default: 10
    },
    // menu: { // Deprecated in favor of Menu collection
    //     type: mongoose.Schema.Types.Mixed,
    //     default: {}
    // },
    timeSlots: [{
        type: String
    }],
    configDate: {
        type: String
    },
    facilities: [{
        type: String
    }],
    tableConfig: {
        twoSeaterTables: { type: Number, default: 0, min: 0 },
        fourSeaterTables: { type: Number, default: 0, min: 0 },
        sixSeaterTables: { type: Number, default: 0, min: 0 },
        groupTables: { type: Number, default: 0, min: 0 },
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'inactive', 'expired', 'pending_approval'],
        default: 'inactive'
    },
    subscriptionExpiresAt: {
        type: Date
    },
    subscriptionPaymentId: {
        type: String // Razorpay payment ID for the latest subscription
    },
    lastSubscriptionRenewal: {
        type: Date
    },
    reviewCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

restaurantSchema.index({ ownerId: 1 });
restaurantSchema.index({ location: 1 });
restaurantSchema.index({ cuisine: 1 });
restaurantSchema.index({ isApproved: 1 });
restaurantSchema.index({ rating: -1 });
restaurantSchema.index({ name: 'text', cuisine: 'text' }); // For basic text search
restaurantSchema.index({ subscriptionStatus: 1 });
restaurantSchema.index({ subscriptionExpiresAt: 1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);
