const express = require('express');
const router = express.Router();
const {
    submitApplication,
    getApplicationStatus,
    getAllApplications,
} = require('../controllers/ownerController');
const timeSlotController = require('../controllers/timeSlotController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.post('/apply', upload.array('images', 5), submitApplication);
router.get('/status', protect, getApplicationStatus);

// Slot Manager routes (mounted at /api/v1/owner/slots)
router.post('/slots', protect, authorize('owner', 'admin'), timeSlotController.createSlot);
router.get('/slots', protect, authorize('owner', 'admin'), timeSlotController.getOwnerSlots);
router.delete('/slots/:id', protect, authorize('owner', 'admin'), timeSlotController.deleteSlot);

const ownerController = require('../controllers/ownerController');
router.get('/analytics', protect, authorize('owner', 'admin'), ownerController.getAnalytics);

module.exports = router;
