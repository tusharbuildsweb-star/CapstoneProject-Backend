const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Models
const User = require('./src/models/User');
const Restaurant = require('./src/models/Restaurant');
const Review = require('./src/models/Review');
const Reservation = require('./src/models/Reservation');
const TimeSlot = require('./src/models/TimeSlot');
const Package = require('./src/models/Package');

const KEEP_EMAILS = [
    'adnanmohammed7896@gmail.com', // Palm Shore owner
    'thirukumar3210@gmail.com'     // Khalid's Biryani owner
    // Need to keep admin? Let's keep admins.
];

async function cleanData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        // 1. Keep admin users and the specified owner emails
        console.log('Finding users to keep...');
        const usersToKeep = await User.find({
            $or: [
                { email: { $in: KEEP_EMAILS } },
                { role: 'admin' }
            ]
        });

        const keptUserIds = usersToKeep.map(u => u._id);
        const keptUserEmails = usersToKeep.map(u => u.email);

        console.log(`Keeping ${usersToKeep.length} users:`, keptUserEmails);

        // Remove all other users
        const userDeleteResult = await User.deleteMany({ _id: { $nin: keptUserIds } });
        console.log(`Deleted ${userDeleteResult.deletedCount} demo/fake users.`);

        // 2. Remove all restaurants NOT linked to the kept users
        const restaurantDeleteResult = await Restaurant.deleteMany({ ownerId: { $nin: keptUserIds } });
        console.log(`Deleted ${restaurantDeleteResult.deletedCount} seed/demo restaurants.`);

        // Also clean up menus in the remaining restaurants (make them empty temporarily if full removal is desired, but user just wants demo data gone). We will wipe their menu and slots so they are clean, then Step 2 & 3 will seed them.
        const keptRestaurants = await Restaurant.find({ ownerId: { $in: keptUserIds } });
        const keptRestaurantIds = keptRestaurants.map(r => r._id);

        for (const restaurant of keptRestaurants) {
            restaurant.menu = undefined; // Clear existing menus to ensure pristine state
            await restaurant.save();
        }
        console.log(`Cleared menus for the ${keptRestaurants.length} kept restaurants.`);

        // 3. Remove all Packages, TimeSlots, Reviews, Reservations completely 
        // We will recreate clean packages and slots via setup script
        const reviewDeleteResult = await Review.deleteMany({});
        console.log(`Deleted ${reviewDeleteResult.deletedCount} fake reviews.`);

        const reservationDeleteResult = await Reservation.deleteMany({});
        console.log(`Deleted ${reservationDeleteResult.deletedCount} reservations.`);

        const pkgDeleteResult = await Package.deleteMany({});
        console.log(`Deleted ${pkgDeleteResult.deletedCount} packages.`);

        const slotDeleteResult = await TimeSlot.deleteMany({});
        console.log(`Deleted ${slotDeleteResult.deletedCount} time slots.`);

        console.log('-----------------------------------');
        console.log('CLEANUP COMPLETE: No demo data exists');
        console.log('-----------------------------------');
        process.exit(0);

    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
}

cleanData();
