const express = require('express');
const router = express.Router();
const {
    getAllRestaurants,
    searchRestaurants,
    getRestaurantById,
    getMyRestaurant,
    createRestaurant,
    updateRestaurant,
    updateCrowdLevel,
    getMenu,
    getFilters
} = require('../controllers/restaurantController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// ── Public routes (specific paths MUST come before /:id wildcard) ──────────────
router.get('/', getAllRestaurants);
router.get('/filters', getFilters);
router.get('/search', searchRestaurants);

// ── Owner protected routes (MUST be before /:id to avoid wildcard capture) ─────
router.get('/owner/me', protect, authorizeRoles('owner', 'admin'), getMyRestaurant);
router.post('/', protect, authorizeRoles('owner', 'admin'), createRestaurant);

// ── Wildcard (id-based) routes — always last ────────────────────────────────────
router.get('/:id', getRestaurantById);
router.get('/:id/menu', getMenu);
router.put('/:id', protect, authorizeRoles('owner', 'admin'), updateRestaurant);
router.put('/:id/crowd', protect, authorizeRoles('owner', 'admin'), updateCrowdLevel);

module.exports = router;
