const userService = require('../services/userService');

const updateProfile = async (req, res, next) => {
    try {
        const updateData = { ...req.body };
        if (req.file) {
            updateData.profileImage = `/uploads/profiles/${req.file.filename}`;
        }
        const updatedUser = await userService.updateProfile(req.user._id, updateData);
        res.json(updatedUser);
    } catch (error) {
        res.status(400);
        next(error);
    }
};

const getUserReservations = async (req, res, next) => {
    try {
        const reservations = await userService.getUserReservations(req.user._id);
        res.json(reservations);
    } catch (error) {
        next(error);
    }
};

const getUserReviews = async (req, res, next) => {
    try {
        const reviews = await userService.getUserReviews(req.user._id);
        res.json(reviews);
    } catch (error) {
        next(error);
    }
};

const toggleFavorite = async (req, res, next) => {
    try {
        const favorites = await userService.toggleFavorite(req.user._id, req.params.restaurantId);
        res.json({ message: 'Favorites updated successfully', favorites });
    } catch (error) {
        res.status(400);
        next(error);
    }
};

const getFavorites = async (req, res, next) => {
    try {
        const favorites = await userService.getFavorites(req.user._id);
        res.json(favorites);
    } catch (error) {
        res.status(400);
        next(error);
    }
};

module.exports = {
    updateProfile,
    getUserReservations,
    getUserReviews,
    toggleFavorite,
    getFavorites
};
