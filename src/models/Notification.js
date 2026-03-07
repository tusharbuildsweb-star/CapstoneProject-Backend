const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['user', 'owner', 'admin'],
        required: true,
        default: 'user'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['reservation', 'payment', 'system', 'support', 'subscription'],
        default: 'system'
    },
    read: {
        type: Boolean,
        default: false
    },
    link: {
        type: String, // Optional link to reservation or dashboard
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
