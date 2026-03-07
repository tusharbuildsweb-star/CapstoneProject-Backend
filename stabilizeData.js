const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Restaurant = require('./src/models/Restaurant');
const Review = require('./src/models/Review');
const User = require('./src/models/User');
const Package = require('./src/models/Package');
const Menu = require('./src/models/Menu');
const TimeSlot = require('./src/models/TimeSlot');

dotenv.config({ path: path.join(__dirname, '.env') });

const cuisines = ['Italian', 'Indian', 'Chinese', 'Japanese', 'Mexican', 'French', 'Mediterranean', 'Thai', 'American', 'Continental'];
const times = ['12:00 PM', '06:00 PM', '09:00 PM'];

async function stabilize() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB...');

        const restaurants = await Restaurant.find();
        console.log(`Checking ${restaurants.length} restaurants...`);

        const reviewers = await User.find({ role: 'user' }).limit(15);
        if (reviewers.length < 10) {
            console.error('Not enough users to create reviews. Please run seed script first.');
            process.exit(1);
        }

        const today = new Date();
        const endDate = new Date('2026-04-30T23:59:59Z');

        for (const restaurant of restaurants) {
            console.log(`Stabilizing: ${restaurant.name}`);

            // 1. Ensure Menu items in the separate Menu collection
            const menuCount = await Menu.countDocuments({ restaurantId: restaurant._id });
            if (menuCount < 5) {
                const cuisine = restaurant.cuisine || 'Continental';
                const dishes = [
                    { name: 'Signature Starter', category: 'Starter', price: 250 },
                    { name: 'Chef Special Main', category: 'Main Course', price: 550 },
                    { name: 'House Dessert', category: 'Dessert', price: 300 },
                    { name: 'Refreshing Cooler', category: 'Beverage', price: 150 },
                    { name: 'Gourmet Side', category: 'Side Dish', price: 200 }
                ];

                for (const dish of dishes) {
                    await Menu.create({
                        restaurantId: restaurant._id,
                        name: `${restaurant.name} ${dish.name}`,
                        description: `Our finest ${cuisine} ${dish.category.toLowerCase()}.`,
                        price: dish.price,
                        category: dish.category,
                        isAvailable: true,
                        status: 'Active'
                    });
                }

                // Clear deprecated field if it exists
                if (restaurant.menu) {
                    restaurant.menu = undefined;
                    await restaurant.save();
                }
            }

            // 2. Ensure 10 Reviews
            const revCount = await Review.countDocuments({ restaurantId: restaurant._id });
            if (revCount < 10) {
                for (let i = revCount; i < 10; i++) {
                    await Review.create({
                        userId: reviewers[i % reviewers.length]._id,
                        restaurantId: restaurant._id,
                        rating: 4 + (i % 2) * 0.5,
                        foodRating: 9,
                        ambienceRating: 8,
                        staffRating: 9,
                        comment: 'Excellent service and authentic flavors! Highly recommended.'
                    });
                }
                // Update restaurant rating and reviewCount
                const allReviews = await Review.find({ restaurantId: restaurant._id });
                const avg = allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length;
                restaurant.rating = Number(avg.toFixed(1));
                restaurant.reviewCount = allReviews.length;
                await restaurant.save();
            }

            // 3. Ensure Packages
            const pkgCount = await Package.countDocuments({ restaurantId: restaurant._id });
            if (pkgCount < 2) {
                await Package.create({
                    restaurantId: restaurant._id,
                    title: 'Birthday Celebration Package',
                    type: 'birthday',
                    description: 'Balloon decor, cake setup, and reserved premium table.',
                    price: 2000, // Matching schema field 'price'
                    maxCapacity: 10,
                    isAvailable: true
                });
                await Package.create({
                    restaurantId: restaurant._id,
                    title: 'Corporate Dinner Experience',
                    type: 'corporate',
                    description: 'Quiet zone, high-speed WiFi, and multi-course meal.',
                    price: 5000,
                    maxCapacity: 20,
                    isAvailable: true
                });
            }

            // 4. Ensure Slots until April 30
            let currentDate = new Date(today);
            currentDate.setUTCHours(0, 0, 0, 0);

            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                for (const time of times) {
                    const exists = await TimeSlot.findOne({
                        restaurantId: restaurant._id,
                        date: {
                            $gte: new Date(dateStr + 'T00:00:00Z'),
                            $lte: new Date(dateStr + 'T23:59:59Z')
                        },
                        time: time
                    });

                    if (!exists) {
                        await TimeSlot.create({
                            restaurantId: restaurant._id,
                            date: new Date(dateStr + 'T00:00:00Z'),
                            time: time,
                            capacity: {
                                twoSeater: 5,
                                fourSeater: 5,
                                sixSeater: 2,
                                groupTable: 1
                            },
                            booked: { twoSeater: 0, fourSeater: 0, sixSeater: 0, groupTable: 0 },
                            isActive: true
                        });
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        console.log('Stabilization complete!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

stabilize();
