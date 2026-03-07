const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema({
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
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    guests: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Waiting', 'Notified', 'Completed'],
        default: 'Waiting'
    }
}, { timestamps: true });

module.exports = mongoose.model('Waitlist', waitlistSchema);
