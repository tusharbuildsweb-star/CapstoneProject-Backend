const mongoose = require('mongoose');
const Restaurant = require('../src/models/Restaurant');
const Review = require('../src/models/Review');
const User = require('../src/models/User');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const dummyComments = [
    "Great ambience and food quality. Reservation process was smooth and convenient.",
    "Amazing experience! The staff was very attentive and the food was delicious.",
    "A bit crowded but the atmosphere was lively. Will definitely visit again.",
    "Perfect for a cozy dinner. Loved the signature cocktails.",
    "The reservation system makes it so easy to plan ahead. Highly recommend.",
    "Everything was top-notch. From the appetizers to the dessert, we were impressed.",
    "Modern decor with classic flavors. A hidden gem in the city.",
    "Bit of a wait even with reservation, but the food made up for it. 5 stars for the chef.",
    "The variety in the menu is impressive. Something for everyone.",
    "Truly a luxury dining experience. Worth every penny."
];

const dummyNames = [
    "Rahul Sharma", "Siddharth Malhotra", "Anjali Gupta", "Priya Singh", "Amit Kumar",
    "Sneha Reddy", "Vikram Rathore", "Pooja Verma", "Karan Johar", "Ishita Iyer"
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB for seeding...');

        const restaurants = await Restaurant.find({});
        console.log(`Found ${restaurants.length} restaurants.`);

        // Create or find dummy users for reviews to avoid unique constraint issues
        const dummyUsers = [];
        for (let i = 0; i < 10; i++) {
            let email = `dummy_user_${i}@example.com`;
            let user = await User.findOne({ email });
            if (!user) {
                user = await User.create({
                    name: dummyNames[i],
                    email: email,
                    password: 'Password@123', // required
                    role: 'user'
                });
            }
            dummyUsers.push(user);
        }

        for (const restaurant of restaurants) {
            console.log(`Seeding reviews for: ${restaurant.name}`);

            // Delete existing dummy reviews for this restaurant if needed, or just append
            // For QA evaluation, we want exactly 10.

            for (let i = 0; i < 10; i++) {
                try {
                    await Review.create({
                        userId: dummyUsers[i]._id,
                        restaurantId: restaurant._id,
                        rating: Math.floor(Math.random() * 3) + 3, // 3 to 5
                        comment: dummyComments[i % dummyComments.length],
                        createdAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30) // Random date in last 30 days
                    });
                } catch (err) {
                    // Likely unique constraint (one review per user per restaurant)
                    // If we already seeded, this will hit.
                    if (err.code !== 11000) console.error(err);
                }
            }

            // Recalculate restaurant average rating
            const reviews = await Review.find({ restaurantId: restaurant._id });
            const avg = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
            restaurant.rating = parseFloat(avg.toFixed(1));
            await restaurant.save();
        }

        console.log('Seeding completed successfully!');
    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

seed();
