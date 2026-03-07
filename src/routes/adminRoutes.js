const express = require('express');
const router = express.Router();
const {
    getPendingRestaurants,
    getAllRestaurantsAdmin,
    approveRestaurant,
    rejectRestaurant,
    deleteRestaurantAdmin,
    getAllUsers,
    suspendUser,
    activateUser,
    deleteUser,
    deleteOwnerApplication,
    deleteReview,
    getPlatformAnalytics,
    getAllPayments,
    getAllReservations,
    updateReservationStatusAdmin,
    forceApproveAllRestaurants,
    seedRestaurants
} = require('../controllers/adminController');

const {
    getAllApplications,
    approveApplication,
    rejectApplication
} = require('../controllers/ownerController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

// ── Dev helpers (unprotected — no auth token required) ────────────────────────
router.put('/force-approve-restaurants', forceApproveAllRestaurants);
router.post('/seed-restaurants', seedRestaurants);

// All routes protected & admin only
router.use(protect, adminOnly);

// Analytics, Payments & Reservations
router.get('/analytics', getPlatformAnalytics);
router.get('/payments', getAllPayments);
router.get('/reservations', getAllReservations);
router.put('/reservations/:id/status', updateReservationStatusAdmin);

// Restaurant management
router.get('/restaurants', getAllRestaurantsAdmin);
router.get('/restaurants/pending', getPendingRestaurants);
router.put('/restaurants/:id/approve', approveRestaurant);
router.put('/restaurants/:id/reject', rejectRestaurant);
router.delete('/restaurants/:id', deleteRestaurantAdmin);

// User management
router.get('/users', getAllUsers);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/activate', activateUser);
router.delete('/users/:id', deleteUser);

// Owner Applications
router.get('/owner-applications', getAllApplications);
router.put('/owner/:id/approve', approveApplication);
router.put('/owner/:id/reject', rejectApplication);
router.delete('/owner-applications/:id', deleteOwnerApplication);

// Review moderation
router.delete('/reviews/:id', deleteReview);

module.exports = router;
