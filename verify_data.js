const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Restaurant = require('./src/models/Restaurant');
const Review = require('./src/models/Review');
const Menu = require('./src/models/Menu');
const Package = require('./src/models/Package');

dotenv.config({ path: path.join(__dirname, '.env') });

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const restCount = await Restaurant.countDocuments();
        const reviewCount = await Review.countDocuments();
        const menuCount = await Menu.countDocuments();
        const packageCount = await Package.countDocuments();

        console.log('--- DATA VERIFICATION REPORT ---');
        console.log(`Restaurants: ${restCount}`);
        console.log(`Total Reviews: ${reviewCount}`);
        console.log(`Total Menu Items: ${menuCount}`);
        console.log(`Total Packages: ${packageCount}`);
        console.log('-------------------------------');

        if (restCount >= 83 && reviewCount >= 83 * 10 && menuCount >= 83 * 5 && packageCount >= 83 * 2) {
            console.log('VERIFICATION SUCCESS: Data meets production density requirements.');
        } else {
            console.log('VERIFICATION WARNING: Some data might be missing.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verify();
