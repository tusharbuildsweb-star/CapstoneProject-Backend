const express = require('express');
const router = express.Router();
const {
    createPackage,
    getRestaurantPackages,
    updatePackage,
    deletePackage
} = require('../controllers/packageController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.get('/:restaurantId', getRestaurantPackages);

// Owner protected routes
router.post('/', protect, authorizeRoles('owner', 'admin'), createPackage);
router.put('/:id', protect, authorizeRoles('owner', 'admin'), updatePackage);
router.delete('/:id', protect, authorizeRoles('owner', 'admin'), deletePackage);

module.exports = router;
