const reservationService = require('../services/reservationService');
const notificationService = require('../services/notificationService');
const Restaurant = require('../models/Restaurant');

const createReservation = async (req, res, next) => {
    try {
        const data = await reservationService.createReservation(req.user._id, req.body);

        // Emit Socket.io event for reservation (owner notification)
        const io = req.app.get('io');
        if (io) {
            io.emit('tableBooked', { restaurantId: req.body.restaurantId, reservation: data });
            io.emit('globalUpdate', {
                type: 'reservationCreated',
                reservationId: data._id
            });
        }

        // Notification for user
        const restaurant = await Restaurant.findById(req.body.restaurantId);
        await notificationService.createNotification(
            req.user._id,
            'reservation_confirmed',
            `Your reservation at ${restaurant?.name || 'the restaurant'} is confirmed.`,
            '/dashboard/user'
        );

        res.status(201).json(data);
    } catch (error) {
        res.status(400);
        next(error);
    }
};

const getUserReservations = async (req, res, next) => {
    try {
        console.log("Logged user:", req.user._id);
        const data = await reservationService.getUserReservations(req.user._id);
        console.log("Found bookings - upcoming:", data.upcoming?.length, "history:", data.history?.length);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

const getAllBookingsForceTest = async (req, res, next) => {
    try {
        // Temporarily return all bookings without filter
        const data = await require('../models/Reservation').find()
            .populate('restaurantId')
            .populate('userId', 'name profileImage');
        res.json(data);
    } catch (error) {
        next(error);
    }
};

const checkDuplicateBooking = async (req, res, next) => {
    try {
        const { restaurantId } = req.params;
        const data = await reservationService.checkDuplicateBooking(req.user._id, restaurantId);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

const getOwnerReservations = async (req, res, next) => {
    try {
        console.log("[OWNER] Fetching reservations for owner:", req.user._id);
        const data = await reservationService.getOwnerReservations(req.user._id);
        console.log("[OWNER] Found", data.length, "reservation(s)");
        res.json(data);
    } catch (error) {
        next(error);
    }
};

const cancelReservation = async (req, res, next) => {
    try {
        const data = await reservationService.cancelReservation(req.params.id, req.user._id);

        // Emit Socket.io event that a reservation is cancelled
        const io = req.app.get('io');
        if (io) {
            io.emit('reservationCancelled', { reservationId: req.params.id });
            io.emit('reservationUpdated', { restaurantId: data.restaurantId });
            io.emit('globalUpdate', {
                type: 'reservationCancelled',
                reservationId: req.params.id
            });
        }

        // Notification for user
        const restaurantName = data.restaurantId?.name || 'the restaurant';
        await notificationService.createNotification(
            req.user._id,
            'reservation_cancelled',
            `Your reservation at ${restaurantName} has been cancelled.`,
            '/dashboard/user'
        );

        res.json(data);
    } catch (error) {
        res.status(403);
        next(error);
    }
};

const updateReservationStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const data = await reservationService.updateReservationStatus(req.params.id, req.user._id, status);

        // Notify user about status change
        if (status === 'Confirmed') {
            await notificationService.createNotification(
                data.userId,
                'reservation_confirmed',
                `Good news! Your reservation at ${data.restaurantId?.name || 'the restaurant'} is confirmed.`,
                '/dashboard/user'
            );
        } else if (status === 'Completed') {
            await notificationService.createNotification(
                data.userId,
                'reservation_completed',
                `We hope you enjoyed your meal at ${data.restaurantId?.name || 'the restaurant'}! Leave a review?`,
                '/dashboard/user/reviews'
            );
        }

        if (global.io) {
            global.io.emit('globalUpdate', {
                type: 'reservationStatusChanged',
                reservationId: data._id
            });
        }

        res.json(data);
    } catch (error) {
        res.status(403);
        next(error);
    }
};

const joinWaitlist = async (req, res, next) => {
    try {
        const data = await reservationService.joinWaitlist(req.user._id, req.body);
        res.status(201).json({ message: 'Successfully joined the waitlist!', waitlist: data });
    } catch (error) {
        res.status(400);
        next(error);
    }
};

module.exports = {
    createReservation,
    getUserReservations,
    getOwnerReservations,
    cancelReservation,
    updateReservationStatus,
    checkDuplicateBooking,
    getAllBookingsForceTest,
    joinWaitlist
};
