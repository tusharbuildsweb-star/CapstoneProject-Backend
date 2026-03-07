const restaurantService = require('../services/restaurantService');

const getAllRestaurants = async (req, res, next) => {
    try {
        const data = await restaurantService.getAllRestaurants(req.query);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

const searchRestaurants = async (req, res, next) => {
    try {
        const { q } = req.query;
        const data = await restaurantService.searchRestaurants(q);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

const getRestaurantById = async (req, res, next) => {
    try {
        const data = await restaurantService.getRestaurantById(req.params.id);
        res.json(data);
    } catch (error) {
        res.status(404);
        next(error);
    }
};

const getMyRestaurant = async (req, res, next) => {
    try {
        const restaurant = await restaurantService.getOwnerRestaurant(req.user._id);

        // Auto-check for expiration
        if (restaurant && restaurant.subscriptionExpiresAt) {
            const now = new Date();
            if (restaurant.subscriptionExpiresAt < now && restaurant.subscriptionStatus === 'active') {
                restaurant.subscriptionStatus = 'expired';
                await restaurant.save();

                if (global.io) {
                    global.io.emit('restaurantUpdated', { restaurantId: restaurant._id });
                }
            }
        }

        res.json(restaurant);
    } catch (error) {
        res.status(404);
        next(error);
    }
};

const createRestaurant = async (req, res, next) => {
    try {
        const data = await restaurantService.createRestaurant(req.user._id, req.body);
        res.status(201).json(data);
    } catch (error) {
        res.status(400);
        next(error);
    }
};

const updateRestaurant = async (req, res, next) => {
    try {
        const data = await restaurantService.updateRestaurant(req.params.id, req.user._id, req.body);
        if (global.io) {
            global.io.emit('globalUpdate');
        }
        res.json(data);
    } catch (error) {
        res.status(403);
        next(error);
    }
};

const updateCrowdLevel = async (req, res, next) => {
    try {
        const { crowdLevel } = req.body;
        const data = await restaurantService.updateCrowdLevel(req.params.id, req.user._id, crowdLevel);

        // Emit Socket.io event for real-time crowd update
        const io = req.app.get('io');
        if (io) {
            io.emit('crowdUpdated', { restaurantId: req.params.id, crowdLevel });
            io.emit('globalUpdate', { type: 'crowd_update', restaurantId: req.params.id });
        }

        res.json(data);
    } catch (error) {
        res.status(403);
        next(error);
    }
};

const Menu = require('../models/Menu');

const getMenu = async (req, res, next) => {
    try {
        const id = req.params.restaurantId || req.params.id;
        const menuItems = await Menu.find({ restaurantId: id, status: 'Active' });
        res.json(menuItems);
    } catch (error) {
        res.status(404);
        next(error);
    }
};

const getFilters = async (req, res, next) => {
    try {
        const filters = await restaurantService.getFilters();
        res.json(filters);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllRestaurants,
    searchRestaurants,
    getRestaurantById,
    getMyRestaurant,
    createRestaurant,
    updateRestaurant,
    updateCrowdLevel,
    getMenu,
    getFilters
};
