const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Restaurant = require('./src/models/Restaurant');
const Menu = require('./src/models/Menu');
const Package = require('./src/models/Package');
const TimeSlot = require('./src/models/TimeSlot');
const Review = require('./src/models/Review');

dotenv.config();

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const restaurants = await Restaurant.find();
        console.log(`Total Restaurants: ${restaurants.length}`);

        for (const res of restaurants.slice(0, 5)) {
            const menuCount = await Menu.countDocuments({ restaurantId: res._id });
            const packageCount = await Package.countDocuments({ restaurantId: res._id });
            const slotCount = await TimeSlot.countDocuments({ restaurantId: res._id });
            const reviewCount = await Review.countDocuments({ restaurantId: res._id });

            console.log(`\nRestaurant: ${res.name} (${res.cuisine})`);
            console.log(`- Menus: ${menuCount}`);
            console.log(`- Packages: ${packageCount}`);
            console.log(`- Slots: ${slotCount}`);
            console.log(`- Reviews: ${reviewCount}`);
            console.log(`- Rating: ${res.rating}`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

verify();
