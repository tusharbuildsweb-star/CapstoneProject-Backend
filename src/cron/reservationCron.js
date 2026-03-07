const cron = require('node-cron');
const Reservation = require('../models/Reservation');
const TimeSlot = require('../models/TimeSlot');
const reservationService = require('../services/reservationService');

// Run every 1 minute
cron.schedule('* * * * *', async () => {
    try {
        // 1. Mark reservations as Completed if time has passed
        // 2. Handle expired pending reservations
        await reservationService.autoCompleteReservations();
    } catch (error) {
        console.error('Error in reservation cron job:', error);
    }
});
