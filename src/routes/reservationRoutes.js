const express = require('express');
const router = express.Router();
const {
    createReservation,
    getUserReservations,
    getOwnerReservations,
    cancelReservation,
    updateReservationStatus,
    checkDuplicateBooking,
    getAllBookingsForceTest,
    joinWaitlist
} = require('../controllers/reservationController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.post('/', protect, createReservation);
router.get('/all', getAllBookingsForceTest);
router.get('/user', protect, getUserReservations);
router.get('/restaurant/:restaurantId/check', protect, checkDuplicateBooking);
router.get('/owner', protect, authorizeRoles('owner', 'admin'), getOwnerReservations);
router.put('/:id/cancel', protect, cancelReservation);
router.put('/:id/status', protect, authorizeRoles('owner', 'admin'), updateReservationStatus);
router.post('/waitlist', protect, joinWaitlist);

module.exports = router;
