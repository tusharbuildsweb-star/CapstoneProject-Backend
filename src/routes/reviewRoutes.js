const express = require('express');
const router = express.Router();
const {
    addReview,
    getReviews,
    editReview,
    deleteReview,
    ownerReply
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Public - get reviews for a restaurant
router.get('/:restaurantId', getReviews);

// Authenticated - post/edit/delete reviews
router.post('/', protect, authorizeRoles('user', 'owner', 'admin'), addReview);
router.put('/:id', protect, editReview);
router.delete('/:id', protect, deleteReview);

// Owner reply
router.put('/:id/reply', protect, authorizeRoles('owner', 'admin'), ownerReply);

module.exports = router;
