const supportService = require('../services/supportService');

const createTicket = async (req, res, next) => {
    try {
        const ticketData = { ...req.body };
        if (req.file) {
            ticketData.image = `/uploads/tickets/${req.file.filename}`;
        }
        const data = await supportService.createTicket(req.user._id, ticketData);

        // Emit Socket.io event
        const io = req.app.get('io');
        if (io) {
            io.emit('globalUpdate', { type: 'ticket_created', ticketId: data._id });
        }

        res.status(201).json(data);
    } catch (error) {
        res.status(400);
        next(error);
    }
};

const getUserTickets = async (req, res, next) => {
    try {
        const data = await supportService.getUserTickets(req.user._id);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

const getAdminTickets = async (req, res, next) => {
    try {
        const data = await supportService.getAdminTickets();
        res.json(data);
    } catch (error) {
        next(error);
    }
};

const updateTicketStatus = async (req, res, next) => {
    try {
        const data = await supportService.updateTicketStatus(req.params.id, req.body, req.user._id);

        // Emit Socket.io event
        const io = req.app.get('io');
        if (io) {
            if (data.status === 'Resolved') {
                io.emit('globalUpdate', { type: 'ticket_resolved', ticketId: data.ticketId, userId: data.userId });
            } else {
                io.emit('globalUpdate', { type: 'ticket_updated', ticketId: data.ticketId });
            }
        }

        res.json(data);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createTicket,
    getUserTickets,
    getAdminTickets,
    updateTicketStatus
};
