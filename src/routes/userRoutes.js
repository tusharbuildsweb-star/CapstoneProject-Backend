const express = require('express');
const router = express.Router();
const { updateProfile, getUserReservations, getUserReviews, toggleFavorite, getFavorites } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.put('/profile', protect, upload.single('profileImage'), updateProfile);
router.get('/reservations', protect, getUserReservations);
router.get('/reviews', protect, getUserReviews);
// Favorites
router.post('/favorites/:restaurantId', protect, toggleFavorite);
router.get('/favorites', protect, getFavorites);

module.exports = router;
