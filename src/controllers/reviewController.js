const reviewService = require('../services/reviewService');

const getReviews = async (req, res, next) => {
    try {
        const data = await reviewService.getReviewsByRestaurant(req.params.restaurantId);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

const addReview = async (req, res, next) => {
    try {
        const data = await reviewService.addReview(req.user._id, req.body);
        if (global.io) {
            global.io.emit('globalUpdate');
            global.io.emit('newReviewAdded', data);
        }
        res.status(201).json(data);
    } catch (error) {
        res.status(400);
        next(error);
    }
};

const editReview = async (req, res, next) => {
    try {
        const data = await reviewService.editReview(req.params.id, req.user._id, req.body);
        if (global.io) {
            global.io.emit('globalUpdate');
            global.io.emit('newReviewAdded', data);
        }
        res.json(data);
    } catch (error) {
        res.status(403);
        next(error);
    }
};

const deleteReview = async (req, res, next) => {
    try {
        const data = await reviewService.deleteReview(req.params.id, req.user._id, req.user.role);
        if (global.io) {
            global.io.emit('globalUpdate');
            global.io.emit('newReviewAdded', { id: req.params.id, deleted: true });
        }
        res.json(data);
    } catch (error) {
        res.status(403);
        next(error);
    }
};

const ownerReply = async (req, res, next) => {
    try {
        const data = await reviewService.ownerReply(req.params.id, req.user._id, req.body.replyText);
        if (global.io) {
            global.io.emit('globalUpdate');
        }
        res.json(data);
    } catch (error) {
        res.status(403);
        next(error);
    }
};

module.exports = {
    getReviews,
    addReview,
    editReview,
    deleteReview,
    ownerReply
};
