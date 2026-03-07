const packageService = require('../services/packageService');

const createPackage = async (req, res, next) => {
    try {
        const data = await packageService.createPackage(req.user._id, req.body);
        if (global.io) {
            global.io.emit('globalUpdate');
        }
        res.status(201).json(data);
    } catch (error) {
        res.status(403);
        next(error);
    }
};

const getRestaurantPackages = async (req, res, next) => {
    try {
        const data = await packageService.getRestaurantPackages(req.params.restaurantId);
        res.json(data);
    } catch (error) {
        res.status(404);
        next(error);
    }
};

const updatePackage = async (req, res, next) => {
    try {
        const data = await packageService.updatePackage(req.params.id, req.user._id, req.body);
        if (global.io) {
            global.io.emit('globalUpdate');
        }
        res.json(data);
    } catch (error) {
        res.status(403);
        next(error);
    }
};

const deletePackage = async (req, res, next) => {
    try {
        const result = await packageService.deletePackage(req.params.id, req.user._id);
        if (global.io) {
            global.io.emit('globalUpdate');
        }
        res.json(result);
    } catch (error) {
        res.status(403);
        next(error);
    }
};

module.exports = {
    createPackage,
    getRestaurantPackages,
    updatePackage,
    deletePackage
};
