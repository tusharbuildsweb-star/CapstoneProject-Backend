const adminService = require('../services/adminService');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

// ── Restaurants ──────────────────────────────────────────────────────────────
const getPendingRestaurants = async (req, res, next) => {
    try { res.json(await adminService.getPendingRestaurants()); }
    catch (error) { next(error); }
};

const getAllRestaurantsAdmin = async (req, res, next) => {
    try { res.json(await adminService.getAllRestaurants()); }
    catch (error) { next(error); }
};

const approveRestaurant = async (req, res, next) => {
    try { res.json(await adminService.approveRestaurant(req.params.id)); }
    catch (error) { res.status(404); next(error); }
};

const rejectRestaurant = async (req, res, next) => {
    try { res.json(await adminService.rejectRestaurant(req.params.id)); }
    catch (error) { res.status(404); next(error); }
};

const deleteRestaurantAdmin = async (req, res, next) => {
    try { res.json(await adminService.deleteRestaurant(req.params.id)); }
    catch (error) { res.status(404); next(error); }
};

// ── Users ─────────────────────────────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
    try { res.json(await adminService.getAllUsers()); }
    catch (error) { next(error); }
};

const suspendUser = async (req, res, next) => {
    try { res.json(await adminService.suspendUser(req.params.id)); }
    catch (error) { res.status(400); next(error); }
};

const activateUser = async (req, res, next) => {
    try { res.json(await adminService.activateUser(req.params.id)); }
    catch (error) { res.status(400); next(error); }
};

const deleteUser = async (req, res, next) => {
    try { res.json(await adminService.deleteUser(req.params.id)); }
    catch (error) { res.status(400); next(error); }
};

// ── Owner Applications ────────────────────────────────────────────────────────
const deleteOwnerApplication = async (req, res, next) => {
    try { res.json(await adminService.deleteOwnerApplication(req.params.id)); }
    catch (error) { res.status(404); next(error); }
};

// ── Reviews ───────────────────────────────────────────────────────────────────
const deleteReview = async (req, res, next) => {
    try { res.json(await adminService.deleteReview(req.params.id)); }
    catch (error) { res.status(404); next(error); }
};

// ── Analytics & Payments ─────────────────────────────────────────────────────────────────
const getPlatformAnalytics = async (req, res, next) => {
    try { res.json(await adminService.getPlatformAnalytics()); }
    catch (error) { next(error); }
};

const getAllPayments = async (req, res, next) => {
    try { res.json(await adminService.getAllPayments()); }
    catch (error) { next(error); }
};

const getAllReservations = async (req, res, next) => {
    try { res.json(await adminService.getAllReservations()); }
    catch (error) { next(error); }
};

const updateReservationStatusAdmin = async (req, res, next) => {
    try { res.json(await adminService.updateReservationStatusAdmin(req.params.id, req.body.status)); }
    catch (error) { res.status(400); next(error); }
};

// ── Dev Helpers ──────────────────────────────────────────────────────────────
const forceApproveAllRestaurants = async (req, res, next) => {
    try {
        const result = await Restaurant.updateMany(
            { isApproved: false },
            { $set: { isApproved: true } }
        );
        if (global.io) global.io.emit('dataUpdated', { type: 'restaurantApproved' });
        res.json({ message: `Force-approved ${result.modifiedCount} restaurant(s).`, result });
    } catch (error) { next(error); }
};

const seedRestaurants = async (req, res, next) => {
    try {
        let owner = await User.findOne({ role: { $in: ['admin', 'owner'] } });
        if (!owner) return res.status(400).json({ message: 'No owner or admin user found. Please register first.' });

        const seeds = [
            {
                name: 'Adyar Bhavan',
                location: 'Chennai, Tamil Nadu',
                cuisine: 'South Indian',
                priceRange: '₹₹',
                isApproved: true,
                crowdLevel: 'Normal',
                tables: 20,
                images: ['https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=1200']
            },
            {
                name: 'Zaitoon',
                location: 'Chennai, Tamil Nadu',
                cuisine: 'Middle Eastern',
                priceRange: '₹₹₹',
                isApproved: true,
                crowdLevel: 'Normal',
                tables: 15,
                images: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200']
            }
        ];

        const results = [];
        for (const seed of seeds) {
            const existing = await Restaurant.findOne({ name: seed.name });
            if (existing) {
                existing.isApproved = true;
                await existing.save();
                results.push({ name: seed.name, action: 'approved' });
            } else {
                await Restaurant.create({ ...seed, ownerId: owner._id });
                results.push({ name: seed.name, action: 'created' });
            }
        }

        if (global.io) global.io.emit('dataUpdated', { type: 'restaurantApproved' });
        res.json({ message: 'Seed complete.', results });
    } catch (error) { next(error); }
};

module.exports = {
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
};
