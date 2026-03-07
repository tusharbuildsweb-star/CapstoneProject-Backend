const SupportTicket = require('../models/SupportTicket');

class SupportService {
    async createTicket(userId, data) {
        // Generate Case-ID: #TKT-XXXXX
        const ticketId = `#TKT-${Math.floor(10000 + Math.random() * 90000)}`;

        const ticket = new SupportTicket({
            ...data,
            ticketId,
            userId,
            messages: [{
                senderId: userId,
                message: data.description,
                timestamp: new Date()
            }]
        });
        const savedTicket = await ticket.save();

        if (global.io) {
            global.io.emit('ticketCreated', savedTicket);
            global.io.emit('globalUpdate', { type: 'support_ticket_created', ticketId: savedTicket._id });
        }

        return savedTicket;
    }

    async getUserTickets(userId) {
        return await SupportTicket.find({ userId }).sort({ createdAt: -1 });
    }

    async getAdminTickets() {
        return await SupportTicket.find({}).populate('userId', 'name email').sort({ createdAt: -1 });
    }

    async updateTicketStatus(id, data, adminId) {
        const ticket = await SupportTicket.findById(id);
        if (!ticket) throw new Error('Ticket not found');

        if (data.status) {
            ticket.status = data.status;
        }

        const replyContent = data.message || data.adminReply;
        if (replyContent) {
            ticket.messages.push({
                senderId: adminId,
                message: replyContent,
                timestamp: new Date()
            });
        }

        const updatedTicket = await ticket.save();

        if (global.io) {
            global.io.emit('ticketUpdated', updatedTicket);
            global.io.emit('globalUpdate', { type: 'support_ticket_updated', ticketId: updatedTicket._id });
            if (updatedTicket.status === 'Resolved' || updatedTicket.status === 'Closed') {
                global.io.emit('ticketClosed', updatedTicket);
            }
        }

        return updatedTicket;
    }
}

module.exports = new SupportService();
