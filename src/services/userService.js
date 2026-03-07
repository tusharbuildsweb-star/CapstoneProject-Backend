const User = require('../models/User');
const Reservation = require('../models/Reservation');
const Review = require('../models/Review');

class UserService {
    async updateProfile(userId, updateData) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Update Email if provided and not taken
        if (updateData.email && updateData.email !== user.email) {
            const existingUser = await User.findOne({ email: updateData.email });
            if (existingUser) {
                throw new Error('Email is already in use');
            }
            user.email = updateData.email;
        }

        user.name = updateData.name || user.name;
        user.mobileNumber = updateData.mobileNumber !== undefined ? updateData.mobileNumber : user.mobileNumber;
        user.profileImage = updateData.profileImage || user.profileImage;

        if (updateData.password) {
            user.password = updateData.password;
        }

        await user.save();

        if (global.io) {
            global.io.emit('globalUpdate', {
                type: 'profileUpdated',
                userId
            });
        }

        return {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            mobileNumber: user.mobileNumber,
            profileImage: user.profileImage
        };
    }

    async getUserReservations(userId) {
        return await Reservation.find({ userId })
            .populate('restaurantId', 'name image location')
            .populate('packageId', 'title')
            .sort({ date: -1 });
    }

    async getUserReviews(userId) {
        return await Review.find({ userId })
            .populate('restaurantId', 'name')
            .sort({ createdAt: -1 });
    }

    async toggleFavorite(userId, restaurantId) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const index = user.favorites.indexOf(restaurantId);
        if (index === -1) {
            user.favorites.push(restaurantId);
        } else {
            user.favorites.splice(index, 1);
        }

        await user.save();
        return user.favorites;
    }

    async getFavorites(userId) {
        const user = await User.findById(userId).populate({
            path: 'favorites',
            select: 'name description location rating averageCost image images cuisine'
        });
        if (!user) throw new Error('User not found');
        return user.favorites;
    }
}

module.exports = new UserService();
