const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const Package = require('../models/Package');
const TimeSlot = require('../models/TimeSlot');
const OwnerApplication = require('../models/OwnerApplication');
const Payment = require('../models/Payment');
const { logActivity } = require('../utils/activityLogger');

class AdminService {

    // ── Restaurants ──────────────────────────────────────────────────────────
    async getPendingRestaurants() {
        return await Restaurant.find({ isApproved: false }).populate('ownerId', 'name email');
    }

    async getAllRestaurants() {
        const restaurants = await Restaurant.find()
            .populate('ownerId', 'name email')
            .lean();

        // Attach live booking count and average rating per restaurant
        const enriched = await Promise.all(restaurants.map(async (r) => {
            const bookingCount = await Reservation.countDocuments({ restaurantId: r._id });
            const reviews = await Review.find({ restaurantId: r._id }, 'rating').lean();
            const avgRating = reviews.length
                ? (reviews.reduce((acc, rv) => acc + rv.rating, 0) / reviews.length).toFixed(1)
                : 0;
            return { ...r, bookingCount, avgRating };
        }));

        return enriched;
    }

    async approveRestaurant(id) {
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) throw new Error('Restaurant not found');
        restaurant.isApproved = true;
        restaurant.subscriptionStatus = 'active'; // Activate on approval
        const saved = await restaurant.save();
        if (global.io) {
            global.io.emit('dataUpdated', { type: 'restaurantApproved', restaurantId: id });
            global.io.emit('globalUpdate', { type: 'restaurant_approved', restaurantId: id });
            global.io.emit('restaurantUpdated', { restaurantId: id });
            global.io.emit('globalUpdate');
        }
        await logActivity(null, 'restaurant_approved', { restaurantId: id });
        return saved;
    }

    async rejectRestaurant(id) {
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) throw new Error('Restaurant not found');
        await restaurant.deleteOne();
        if (global.io) {
            global.io.emit('dataUpdated', { type: 'restaurantDeleted', restaurantId: id });
            global.io.emit('globalUpdate');
        }
        return { message: 'Restaurant application rejected and removed' };
    }

    async deleteRestaurant(id) {
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) throw new Error('Restaurant not found');

        const ownerId = restaurant.ownerId;

        // Cascade delete all related data
        await Package.deleteMany({ restaurantId: id });
        await TimeSlot.deleteMany({ restaurantId: id });
        await Reservation.deleteMany({ restaurantId: id });
        await Review.deleteMany({ restaurantId: id });
        await restaurant.deleteOne();

        // If owner has no other restaurants, downgrade role to 'user'
        const remainingRestaurants = await Restaurant.countDocuments({ ownerId });
        if (remainingRestaurants === 0) {
            await User.findByIdAndUpdate(ownerId, { role: 'user' });
        }

        if (global.io) {
            global.io.emit('dataUpdated', { type: 'restaurantDeleted', restaurantId: id });
            global.io.emit('globalUpdate');
        }
        return { message: 'Restaurant and all associated data deleted successfully.' };
    }

    // ── Users ─────────────────────────────────────────────────────────────────
    async getAllUsers() {
        return await User.find({}, '-password').sort({ createdAt: -1 }).lean();
    }

    async suspendUser(id) {
        const user = await User.findById(id);
        if (!user) throw new Error('User not found');
        if (user.role === 'admin') throw new Error('Cannot suspend an admin account');
        user.isSuspended = true;
        await user.save();
        if (global.io) {
            global.io.emit('dataUpdated', { type: 'userSuspended', userId: id });
            global.io.emit('globalUpdate');
        }
        return { message: 'User suspended.' };
    }

    async activateUser(id) {
        const user = await User.findById(id);
        if (!user) throw new Error('User not found');
        user.isSuspended = false;
        await user.save();
        if (global.io) {
            global.io.emit('dataUpdated', { type: 'userActivated', userId: id });
            global.io.emit('globalUpdate');
        }
        return { message: 'User activated.' };
    }

    async deleteUser(id) {
        const user = await User.findById(id);
        if (!user) throw new Error('User not found');
        if (user.role === 'admin') throw new Error('Cannot delete an admin account');

        // Cascade delete user data
        await Reservation.deleteMany({ userId: id });
        await Review.deleteMany({ userId: id });
        // Remove their restaurants if owner
        if (user.role === 'owner') {
            const restaurants = await Restaurant.find({ ownerId: id }, '_id').lean();
            for (const r of restaurants) {
                await this.deleteRestaurant(r._id.toString());
            }
        }
        await user.deleteOne();
        if (global.io) {
            global.io.emit('dataUpdated', { type: 'userDeleted', userId: id });
            global.io.emit('globalUpdate');
        }
        return { message: 'User and associated data deleted.' };
    }

    // ── Owner Applications ────────────────────────────────────────────────────
    async deleteOwnerApplication(id) {
        const app = await OwnerApplication.findById(id);
        if (!app) throw new Error('Application not found');
        await app.deleteOne();
        if (global.io) {
            global.io.emit('dataUpdated', { type: 'applicationDeleted', appId: id });
            global.io.emit('globalUpdate');
        }
        return { message: 'Application permanently deleted.' };
    }

    // ── Reviews ───────────────────────────────────────────────────────────────
    async deleteReview(id) {
        const review = await Review.findById(id);
        if (!review) throw new Error('Review not found');

        const restaurantId = review.restaurantId;
        await review.deleteOne();

        // Recalculate restaurant rating
        const remainingReviews = await Review.find({ restaurantId });
        const rating = remainingReviews.length
            ? parseFloat((remainingReviews.reduce((acc, item) => item.rating + acc, 0) / remainingReviews.length).toFixed(1))
            : 0;

        await Restaurant.findByIdAndUpdate(restaurantId, {
            rating,
            reviewCount: remainingReviews.length
        });

        if (global.io) {
            global.io.emit('restaurantRatingUpdated', {
                restaurantId,
                rating,
                reviewCount: remainingReviews.length
            });
            global.io.emit('globalUpdate');
        }
        return { message: 'Review deleted successfully by Admin' };
    }

    // ── Analytics (Real Data) ─────────────────────────────────────────────────
    async getPlatformAnalytics() {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalUsers,
            activeUsers,
            totalRestaurants,
            approvedRestaurants,
            totalReservations,
            activeReservations,
            revenueResult
        ] = await Promise.all([
            User.countDocuments({ role: { $ne: 'admin' } }),
            User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo }, isSuspended: false }),
            Restaurant.countDocuments(),
            Restaurant.countDocuments({ isApproved: true }),
            Reservation.countDocuments(),
            Reservation.countDocuments({ date: { $gte: today }, status: { $in: ['Pending', 'Confirmed'] } }),
            Reservation.aggregate([
                { $match: { paymentStatus: 'Paid' } },
                { $group: { _id: null, total: { $sum: { $add: ['$advancePaid', '$platformFee', '$preorderTotal'] } } } }
            ])
        ]);

        return {
            totalUsers,
            activeUsers,
            totalRestaurants,
            approvedRestaurants,
            totalReservations,
            activeReservations,
            totalRevenue: revenueResult[0]?.total || 0
        };
    }

    // ── Payments ─────────────────────────────────────────────────────────────
    async getAllPayments() {
        return await Payment.find().populate({
            path: 'reservationId',
            populate: [
                { path: 'userId', select: 'name email' },
                { path: 'restaurantId', select: 'name' }
            ]
        }).sort({ createdAt: -1 });
    }

    // ── Reservations ─────────────────────────────────────────────────────────
    async getAllReservations() {
        return await Reservation.find()
            .populate('userId', 'name email profileImage')
            .populate('restaurantId', 'name location')
            .sort({ bookingDateTime: -1 });
    }

    async updateReservationStatusAdmin(id, status) {
        const reservation = await Reservation.findById(id).populate('restaurantId');
        if (!reservation) throw new Error('Reservation not found');

        const oldStatus = reservation.status;
        reservation.status = status;
        const saved = await reservation.save();

        // Handle capacity if status changed to/from cancelled
        const { getTableType } = require('../controllers/timeSlotController');
        const tableType = getTableType(reservation.guests);
        let slotUpdated = false;

        if (status === 'cancelled' && oldStatus !== 'cancelled' && reservation.slotId) {
            await TimeSlot.findByIdAndUpdate(reservation.slotId, { $inc: { [`booked.${tableType}`]: -1 } });
            slotUpdated = true;
        } else if (status !== 'cancelled' && oldStatus === 'cancelled' && reservation.slotId) {
            await TimeSlot.findByIdAndUpdate(reservation.slotId, { $inc: { [`booked.${tableType}`]: 1 } });
            slotUpdated = true;
        }

        if (global.io) {
            if (slotUpdated) global.io.emit('slotUpdated', { restaurantId: reservation.restaurantId._id });
            global.io.emit('globalUpdate', { type: 'reservationStatusChanged', reservationId: id });
        }
        return saved;
    }
}

module.exports = new AdminService();
