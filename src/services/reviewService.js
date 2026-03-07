const Review = require('../models/Review');
const Restaurant = require('../models/Restaurant');
const Reservation = require('../models/Reservation');
const { logActivity } = require('../utils/activityLogger');

class ReviewService {

    async getReviewsByRestaurant(restaurantId) {
        return await Review.find({ restaurantId })
            .populate('userId', 'name profileImage')
            .sort({ createdAt: -1 });
    }

    async addReview(userId, data) {
        const { restaurantId, rating, comment } = data;

        // Check if user has a completed reservation for this restaurant
        const hasDined = await Reservation.findOne({
            userId,
            restaurantId,
            status: 'Completed'
        });

        if (!hasDined) {
            const error = new Error('You can review only after completing a reservation.');
            error.statusCode = 403;
            throw error;
        }

        // Upsert: update if user already reviewed this restaurant
        let review = await Review.findOne({ userId, restaurantId });
        if (review) {
            review.rating = rating;
            review.comment = comment;
            await review.save();
        } else {
            review = await Review.create({ userId, restaurantId, rating, comment });
        }

        // Recalculate restaurant rating
        await this.updateRestaurantRating(restaurantId);

        // Real-time broadcast
        if (global.io) {
            global.io.emit('reviewUpdated', { restaurantId });
            global.io.emit('restaurantUpdated', { restaurantId });
            global.io.emit('globalUpdate', {
                type: 'reviewPosted',
                restaurantId,
                reviewId: review._id
            });
        }

        await logActivity(userId, 'review_posted', { restaurantId, rating });

        return await review.populate('userId', 'name profileImage');
    }

    async editReview(id, userId, data) {
        const review = await Review.findById(id);
        if (!review) throw new Error('Review not found');
        if (review.userId.toString() !== userId.toString()) {
            throw new Error('Not authorized to edit this review');
        }

        review.rating = data.rating || review.rating;
        review.comment = data.comment || review.comment;
        review.images = data.images || review.images;

        await review.save();
        await this.updateRestaurantRating(review.restaurantId);

        if (global.io) {
            global.io.emit('reviewUpdated', { restaurantId: review.restaurantId });
            global.io.emit('restaurantUpdated', { restaurantId: review.restaurantId });
            global.io.emit('globalUpdate', {
                type: 'reviewEdited',
                reviewId: review._id
            });
        }

        return review;
    }

    async deleteReview(id, userId, role) {
        const review = await Review.findById(id);
        if (!review) throw new Error('Review not found');

        // Owner of that restaurant can also delete reviews
        const restaurant = await Restaurant.findById(review.restaurantId);
        const isOwner = restaurant && restaurant.ownerId.toString() === userId.toString();
        const isAuthor = review.userId.toString() === userId.toString();

        if (!isAuthor && role !== 'admin' && !isOwner) {
            throw new Error('Not authorized to delete this review');
        }

        const restaurantId = review.restaurantId;
        await review.deleteOne();
        await this.updateRestaurantRating(restaurantId);

        if (global.io) {
            global.io.emit('reviewUpdated', { restaurantId });
            global.io.emit('restaurantUpdated', { restaurantId });
            global.io.emit('globalUpdate', {
                type: 'reviewDeleted',
                reviewId: id
            });
        }

        return { message: 'Review removed successfully' };
    }

    async ownerReply(id, ownerId, replyText) {
        const review = await Review.findById(id).populate('restaurantId');
        if (!review) throw new Error('Review not found');
        if (review.restaurantId.ownerId.toString() !== ownerId.toString()) {
            throw new Error('Not authorized to reply to this review');
        }

        review.ownerReply = replyText;
        const savedReview = await review.save();

        if (global.io) {
            global.io.emit('reviewUpdated', { restaurantId: review.restaurantId._id });
            global.io.emit('globalUpdate', {
                type: 'reviewReplied',
                reviewId: review._id
            });
        }

        return savedReview;
    }

    async updateRestaurantRating(restaurantId) {
        const reviews = await Review.find({ restaurantId });
        const rating = reviews.length > 0
            ? parseFloat((reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length).toFixed(1))
            : 0;

        await Restaurant.findByIdAndUpdate(restaurantId, {
            rating,
            reviewCount: reviews.length
        });

        if (global.io) {
            global.io.emit('restaurantRatingUpdated', {
                restaurantId,
                rating,
                reviewCount: reviews.length
            });
        }

        return rating;
    }
}

module.exports = new ReviewService();
