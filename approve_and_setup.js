const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();

// Import models
const OwnerApplication = require('./src/models/OwnerApplication');
const User = require('./src/models/User');
const Restaurant = require('./src/models/Restaurant');

async function approveRest(email, password) {
    try {
        console.log(`Processing ${email}...`);
        const app = await OwnerApplication.findOne({ email });
        if (!app) {
            console.log(`No application found for ${email}`);
            return;
        }

        if (app.status === 'approved') {
            console.log(`${email} already approved.`);
            // Still check restaurant
        }

        // 1. Create or Update User
        let user = await User.findOne({ email });
        if (!user) {
            user = new User({
                name: app.ownerName,
                email: app.email,
                password: password, // Model should hash this in pre-save if configured, or we do it manually
                role: 'owner'
            });
            await user.save();
            console.log(`User created for ${email}`);
        } else {
            user.role = 'owner';
            user.password = password; // Should be hashed by model pre-save hook
            await user.save();
            console.log(`User updated for ${email}`);
        }

        // 2. Update Application status
        app.status = 'approved';
        app.userId = user._id;
        await app.save();

        // 3. Create Restaurant if not exists
        let restaurant = await Restaurant.findOne({ ownerId: user._id });
        if (!restaurant) {
            restaurant = new Restaurant({
                ownerId: user._id,
                name: app.restaurantName,
                location: app.location,
                cuisine: app.cuisine,
                content: app.description,
                description: app.description,
                priceRange: '₹₹',
                isApproved: true,
                crowdLevel: 'Normal',
                tables: app.tables || 10,
                facilities: app.facilities || [],
                images: app.images || [],
                rating: 0,
                reviews: []
            });
            await restaurant.save();
            console.log(`Restaurant created: ${app.restaurantName}`);
        } else {
            console.log(`Restaurant already exists for ${email}`);
        }

    } catch (err) {
        console.error(`Error processing ${email}:`, err);
    }
}

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB.');

        await approveRest('adnanmohammed7896@gmail.com', 'ecb111d0');
        await approveRest('thirukumar3210@gmail.com', '263087b3');

        await mongoose.connection.close();
        console.log('Done.');
    } catch (err) {
        console.error('Connection Error:', err);
    }
}

run();
