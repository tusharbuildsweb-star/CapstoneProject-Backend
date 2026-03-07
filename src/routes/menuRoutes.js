const express = require('express');
const router = express.Router();
const {
    addMenuItem,
    updateMenuItem,
    deleteMenuItem
} = require('../controllers/menuController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.post('/', protect, authorizeRoles('owner', 'admin'), addMenuItem);
router.put('/:id', protect, authorizeRoles('owner', 'admin'), updateMenuItem);
router.delete('/:id', protect, authorizeRoles('owner', 'admin'), deleteMenuItem);

module.exports = router;
