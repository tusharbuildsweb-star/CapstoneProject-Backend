const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ticketId: {
        type: String,
        unique: true,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Booking Issue', 'Payment Issue', 'Restaurant Complaint', 'Platform Bug', 'Refund Request', 'General Inquiry']
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['Open', 'In Progress', 'Resolved'],
        default: 'Open'
    },
    messages: [{
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: String,
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
