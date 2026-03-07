const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['birthday', 'corporate', 'other'],
        default: 'other'
    },
    description: {
        type: String,
        required: true
    },
    basePrice: {
        type: Number,
        required: true
    },
    decorationCost: {
        type: Number,
        default: 0
    },
    maxCapacity: {
        type: Number,
        required: true
    },
    decorationDetails: {
        type: String,
        default: ''
    },
    hasBuffet: {
        type: Boolean,
        default: false
    },
    images: [{
        type: String
    }],
    isAvailable: {
        type: Boolean,
        default: true
    },
    guestOptions: [{
        guests: { type: Number, required: true },
        price: { type: Number, required: true }
    }],
    advanceAmount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

packageSchema.index({ restaurantId: 1 });

module.exports = mongoose.model('Package', packageSchema);
