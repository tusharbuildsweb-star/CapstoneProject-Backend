const Menu = require('../models/Menu');
const Restaurant = require('../models/Restaurant');

// @desc    Add menu item
// @route   POST /api/v1/menu
// @access  Private/Owner
const addMenuItem = async (req, res, next) => {
    try {
        const ownerId = req.user._id;
        const restaurant = await Restaurant.findOne({ ownerId });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found for this owner' });
        }

        const menuItem = new Menu({
            ...req.body,
            restaurantId: restaurant._id
        });

        await menuItem.save();

        if (global.io) {
            global.io.emit('globalUpdate', {
                type: 'menu_updated',
                restaurantId: restaurant._id,
                action: 'add'
            });
        }

        res.status(201).json(menuItem);
    } catch (error) {
        res.status(400);
        next(error);
    }
};

// @desc    Update menu item
// @route   PUT /api/v1/menu/:id
// @access  Private/Owner
const updateMenuItem = async (req, res, next) => {
    try {
        const ownerId = req.user._id;
        const restaurant = await Restaurant.findOne({ ownerId });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found for this owner' });
        }

        const menuItem = await Menu.findOneAndUpdate(
            { _id: req.params.id, restaurantId: restaurant._id },
            req.body,
            { new: true, runValidators: true }
        );

        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found or unauthorized' });
        }

        if (global.io) {
            global.io.emit('globalUpdate', {
                type: 'menu_updated',
                restaurantId: restaurant._id,
                action: 'update'
            });
        }

        res.json(menuItem);
    } catch (error) {
        res.status(400);
        next(error);
    }
};

// @desc    Delete menu item
// @route   DELETE /api/v1/menu/:id
// @access  Private/Owner
const deleteMenuItem = async (req, res, next) => {
    try {
        const ownerId = req.user._id;
        const restaurant = await Restaurant.findOne({ ownerId });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found for this owner' });
        }

        const menuItem = await Menu.findOneAndDelete({
            _id: req.params.id,
            restaurantId: restaurant._id
        });

        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found or unauthorized' });
        }

        if (global.io) {
            global.io.emit('globalUpdate', {
                type: 'menu_updated',
                restaurantId: restaurant._id,
                action: 'delete'
            });
        }

        res.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        res.status(400);
        next(error);
    }
};

module.exports = {
    addMenuItem,
    updateMenuItem,
    deleteMenuItem
};
