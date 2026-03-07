const mongoose = require('mongoose');

const tableCapacitySchema = {
    twoSeater: { type: Number, default: 0, min: 0 },
    fourSeater: { type: Number, default: 0, min: 0 },
    sixSeater: { type: Number, default: 0, min: 0 },
    groupTable: { type: Number, default: 0, min: 0 },
};

const timeSlotSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    capacity: tableCapacitySchema,
    booked: {
        twoSeater: { type: Number, default: 0, min: 0 },
        fourSeater: { type: Number, default: 0, min: 0 },
        sixSeater: { type: Number, default: 0, min: 0 },
        groupTable: { type: Number, default: 0, min: 0 },
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Prevent duplicate slots for the same restaurant/date/time
timeSlotSchema.index({ restaurantId: 1, date: 1, time: 1 }, { unique: true });

module.exports = mongoose.model('TimeSlot', timeSlotSchema);
