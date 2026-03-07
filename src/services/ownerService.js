const Reservation = require('../models/Reservation');
const Restaurant = require('../models/Restaurant');
const mongoose = require('mongoose');

class OwnerService {
    async getAnalytics(ownerId) {
        const restaurant = await Restaurant.findOne({ ownerId });
        if (!restaurant) throw new Error('Restaurant not found');

        const restaurantId = restaurant._id;

        // 1. Total Reservations (excluding cancelled)
        const totalReservations = await Reservation.countDocuments({
            restaurantId,
            status: { $ne: 'Cancelled' }
        });

        // 2. Monthly Revenue (Current Month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const detailedRevenueData = await Reservation.aggregate([
            {
                $match: {
                    restaurantId,
                    status: 'Completed',
                    createdAt: { $gte: startOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $add: ['$advancePaid', '$remainingAmount'] } }
                }
            }
        ]);

        const monthlyRevenue = detailedRevenueData[0]?.totalRevenue || 0;

        // 3. Popular Menu Items
        const popularItems = await Reservation.aggregate([
            {
                $match: {
                    restaurantId,
                    status: { $ne: 'Cancelled' }
                }
            },
            { $unwind: '$preorderItems' },
            {
                $group: {
                    _id: '$preorderItems.name',
                    count: { $sum: '$preorderItems.quantity' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // 4. Peak Booking Time
        const peakTimeData = await Reservation.aggregate([
            {
                $match: {
                    restaurantId,
                    status: { $ne: 'Cancelled' }
                }
            },
            {
                $group: {
                    _id: '$time',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);

        return {
            totalReservations,
            monthlyRevenue,
            popularItems: popularItems.map(item => ({ name: item._id, count: item.count })),
            peakBookingTime: peakTimeData[0]?._id || 'N/A'
        };
    }
}

module.exports = new OwnerService();
