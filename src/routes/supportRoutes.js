const express = require('express');
const router = express.Router();
const {
    createTicket,
    getUserTickets,
    getAdminTickets,
    updateTicketStatus
} = require('../controllers/supportController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.post('/', protect, upload.single('ticketImage'), createTicket);
router.get('/user', protect, getUserTickets);

// Admin protected routes
router.get('/admin', protect, authorizeRoles('admin'), getAdminTickets);
// Update ticket status (Admin)
router.put('/:id/status', protect, authorizeRoles('admin'), updateTicketStatus);

module.exports = router;
