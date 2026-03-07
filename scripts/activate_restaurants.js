const mongoose = require('mongoose');
const Restaurant = require('../src/models/Restaurant');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function activate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const result = await Restaurant.updateMany({}, {
            $set: {
                subscriptionStatus: 'active',
                isApproved: true,
                subscriptionExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) // 1 year for now
            }
        });
        console.log(`Updated ${result.modifiedCount} restaurants.`);
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

activate();
