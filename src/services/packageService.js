const Package = require('../models/Package');
const Restaurant = require('../models/Restaurant');

class PackageService {
    async createPackage(ownerId, data) {
        // Fetch the restaurant that belongs to this owner
        const restaurant = await Restaurant.findOne({ ownerId });
        if (!restaurant) {
            throw new Error('Not authorized to create packages for this restaurant. No restaurant found.');
        }

        // Forcefully inject this restaurant's ID into the data payload
        const finalData = { ...data, restaurantId: restaurant._id };

        const newPackage = new Package(finalData);
        return await newPackage.save();
    }

    async getRestaurantPackages(restaurantId) {
        return await Package.find({ restaurantId, isAvailable: true });
    }

    async updatePackage(packageId, ownerId, data) {
        const pkg = await Package.findById(packageId).populate('restaurantId');
        if (!pkg) throw new Error('Package not found');
        if (pkg.restaurantId.ownerId.toString() !== ownerId.toString()) {
            throw new Error('Not authorized to update this package');
        }

        Object.assign(pkg, data);
        return await pkg.save();
    }

    async deletePackage(packageId, ownerId) {
        const pkg = await Package.findById(packageId).populate('restaurantId');
        if (!pkg) throw new Error('Package not found');
        if (pkg.restaurantId.ownerId.toString() !== ownerId.toString()) {
            throw new Error('Not authorized to delete this package');
        }

        await pkg.deleteOne();
        return { message: 'Package removed successfully' };
    }
}

module.exports = new PackageService();
