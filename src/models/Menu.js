const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    price: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true,
        index: true
    },
    image: {
        type: String,
        default: ''
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    }
}, { timestamps: true });

module.exports = mongoose.model('Menu', menuSchema);
