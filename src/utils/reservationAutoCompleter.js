const Reservation = require('../models/Reservation');

const startReservationAutoCompleter = () => {
    // Check every 5 minutes
    setInterval(async () => {
        try {
            const now = new Date();
            // Reservations with status 'Confirmed' or 'Pending' that have passed their booking time
            // bookingDateTime is the calculated Date object from date + time
            const expiredBookings = await Reservation.find({
                status: { $in: ['Confirmed', 'Pending'] },
                bookingDateTime: { $lt: now }
            });

            if (expiredBookings.length > 0) {
                console.log(`[AUTO-COMPLETER] Found ${expiredBookings.length} expired bookings. Moving to Completed...`);

                for (const booking of expiredBookings) {
                    booking.status = 'Completed';
                    await booking.save();

                    // Optional: Notify user that booking is completed
                    // We could use notificationService here if we want to be fancy
                }

                if (global.io) {
                    global.io.emit('globalUpdate');
                }
            }
        } catch (error) {
            console.error('[AUTO-COMPLETER] Error during auto-completion check:', error);
        }
    }, 5 * 60 * 1000); // 5 minutes
};

module.exports = { startReservationAutoCompleter };
