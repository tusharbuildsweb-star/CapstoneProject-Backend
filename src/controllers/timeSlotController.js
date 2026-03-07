const TimeSlot = require('../models/TimeSlot');
const Restaurant = require('../models/Restaurant');

// Helper: determine table type from party size
const getTableType = (partySize) => {
    const size = Number(partySize);
    if (size <= 2) return 'twoSeater';
    if (size <= 4) return 'fourSeater';
    if (size <= 6) return 'sixSeater';
    return 'groupTable';
};

const TABLE_TYPE_LABELS = {
    twoSeater: '2-Seater',
    fourSeater: '4-Seater',
    sixSeater: '6-Seater',
    groupTable: 'Group Table'
};

// OWNER: Create a new time slot
const createSlot = async (req, res, next) => {
    try {
        const ownerId = req.user._id;
        const { date, time, capacity, isActive } = req.body;

        if (!capacity) {
            return res.status(400).json({ message: 'Capacity breakdown is required.' });
        }

        const restaurant = await Restaurant.findOne({ ownerId });
        if (!restaurant) {
            return res.status(403).json({ message: 'Restaurant not found for this owner.' });
        }

        const newSlot = new TimeSlot({
            restaurantId: restaurant._id,
            date,
            time,
            capacity: {
                twoSeater: Number(capacity.twoSeater) || 0,
                fourSeater: Number(capacity.fourSeater) || 0,
                sixSeater: Number(capacity.sixSeater) || 0,
                groupTable: Number(capacity.groupTable) || 0,
            },
            booked: { twoSeater: 0, fourSeater: 0, sixSeater: 0, groupTable: 0 },
            isActive: isActive !== undefined ? isActive : true
        });

        await newSlot.save();

        if (global.io) {
            global.io.emit('slotUpdated', { restaurantId: restaurant._id });
            global.io.emit('globalUpdate');
        }

        res.status(201).json({ message: 'Slot created successfully', data: newSlot });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400);
            next(new Error('A slot for this date and time already exists.'));
        } else {
            res.status(400);
            next(error);
        }
    }
};

// OWNER: Get all slots for their restaurant
const getOwnerSlots = async (req, res, next) => {
    try {
        const ownerId = req.user._id;
        const restaurant = await Restaurant.findOne({ ownerId });
        if (!restaurant) {
            return res.status(403).json({ message: 'Restaurant not found.' });
        }

        const slots = await TimeSlot.find({ restaurantId: restaurant._id }).sort({ date: 1, time: 1 });
        res.json({ data: slots });
    } catch (error) {
        res.status(400);
        next(error);
    }
};

// OWNER: Delete a slot
const deleteSlot = async (req, res, next) => {
    try {
        const ownerId = req.user._id;
        const slotId = req.params.id;

        const restaurant = await Restaurant.findOne({ ownerId });
        if (!restaurant) {
            return res.status(403).json({ message: 'Restaurant not found.' });
        }

        const slot = await TimeSlot.findOne({ _id: slotId, restaurantId: restaurant._id });
        if (!slot) {
            return res.status(404).json({ message: 'Slot not found or unauthorized.' });
        }

        const totalBooked = (slot.booked.twoSeater || 0) + (slot.booked.fourSeater || 0) + (slot.booked.sixSeater || 0) + (slot.booked.groupTable || 0);
        if (totalBooked > 0) {
            return res.status(400).json({ message: 'Cannot delete a slot that already has bookings.' });
        }

        await slot.deleteOne();

        if (global.io) {
            global.io.emit('slotUpdated', { restaurantId: restaurant._id });
            global.io.emit('globalUpdate');
        }

        res.json({ message: 'Slot deleted successfully' });
    } catch (error) {
        res.status(400);
        next(error);
    }
};

// PUBLIC: Get available slots filtered by party size
const getPublicSlots = async (req, res, next) => {
    try {
        const { id: restaurantId } = req.params;
        const { date, partySize } = req.query;

        if (!date) {
            return res.status(400).json({ message: 'Date query parameter is required.' });
        }

        const tableType = getTableType(partySize || 2);

        // Date range to cover full UTC day
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const slots = await TimeSlot.find({
            restaurantId,
            date: { $gte: startOfDay, $lte: endOfDay },
            isActive: true
        }).sort({ time: 1 });

        // Return only slots where the correct table type has availability
        const slotData = slots
            .filter(slot => (slot.capacity[tableType] || 0) > 0) // owner configured this table type
            .map(slot => {
                const cap = slot.capacity[tableType] || 0;
                const bkd = slot.booked[tableType] || 0;
                const remaining = cap - bkd;
                return {
                    _id: slot._id,
                    time: slot.time,
                    tableType,
                    tableTypeLabel: TABLE_TYPE_LABELS[tableType],
                    totalCapacity: cap,
                    bookedCount: bkd,
                    remaining,
                    isAvailable: remaining > 0
                };
            })
            .filter(s => s.isAvailable); // only show available

        res.json({ data: slotData });
    } catch (error) {
        res.status(400);
        next(error);
    }
};

module.exports = {
    createSlot,
    getOwnerSlots,
    deleteSlot,
    getPublicSlots,
    getTableType
};
