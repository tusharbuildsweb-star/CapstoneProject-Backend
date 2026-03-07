const express = require('express');
const router = express.Router();
const timeSlotController = require('../controllers/timeSlotController');

// Public route: GET /api/v1/restaurants/:id/slots?date=YYYY-MM-DD
router.get('/:id/slots', timeSlotController.getPublicSlots);

module.exports = router;
