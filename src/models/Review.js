const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    userName: {
        type: String,
        required: true,
        default: 'Guest User'
    },
    profileImage: {
        type: String,
        default: 'https://randomuser.me/api/portraits/men/32.jpg'
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    foodRating: {
        type: Number,
        min: 0,
        max: 10,
        default: 0
    },
    ambienceRating: {
        type: Number,
        min: 0,
        max: 10,
        default: 0
    },
    staffRating: {
        type: Number,
        min: 0,
        max: 10,
        default: 0
    },
    valueRating: {
        type: Number,
        min: 0,
        max: 10,
        default: 0
    },
    cleanlinessRating: {
        type: Number,
        min: 0,
        max: 10,
        default: 0
    },
    comment: {
        type: String,
        required: true
    },
    images: [{
        type: String
    }],
    ownerReply: {
        type: String
    }
}, { timestamps: true });

// Indexes
reviewSchema.index({ restaurantId: 1 });
reviewSchema.index({ userId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
