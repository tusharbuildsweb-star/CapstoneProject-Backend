require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Restaurant = require('./src/models/Restaurant');
const Review = require('./src/models/Review');

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const restaurants = await Restaurant.find({ status: 'approved' }).select('name _id');
    if (!restaurants.length) { console.log('No approved restaurants'); process.exit(0); }

    const users = await User.find({ role: 'user' }).limit(6).select('_id name');
    if (!users.length) { console.log('No users found'); process.exit(0); }

    const reviewData = {
        'Chinese Wok': [
            { rating: 5, comment: 'Amazing Indo-Chinese flavors. Loved the Dragon Chicken - perfectly crispy outside and juicy inside.' },
            { rating: 4, comment: 'Great ambience and fast service. The Veg Fried Rice was excellent. Will definitely return!' },
            { rating: 5, comment: 'Best fried rice in Chennai! The chilli paneer was heavenly. A must-visit for Chinese food lovers.' }
        ],
        'Adyar Bhavan': [
            { rating: 5, comment: 'Authentic South Indian meals. Filter coffee is perfect — exactly like what you get in traditional Tamil Nadu.' },
            { rating: 4, comment: 'Nice traditional vibe. Quiet, clean, and the sambar was absolutely divine. Old-school charm intact.' },
            { rating: 5, comment: 'Masala dosa was crispy and delicious, with the perfect golden crust. The coconut chutney was fresh and flavorful.' }
        ]
    };

    let created = 0;
    for (const restaurant of restaurants) {
        const reviews = reviewData[restaurant.name];
        if (!reviews) { console.log('Skipping: ' + restaurant.name); continue; }

        for (let i = 0; i < reviews.length; i++) {
            const user = users[i % users.length];
            try {
                await Review.findOneAndUpdate(
                    { userId: user._id, restaurantId: restaurant._id },
                    { userId: user._id, restaurantId: restaurant._id, ...reviews[i] },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                created++;
                console.log('v Review ' + (i + 1) + ' for ' + restaurant.name + ' by ' + user.name);
            } catch (e) {
                console.log('  Skip: ' + e.message);
            }
        }

        const allReviews = await Review.find({ restaurantId: restaurant._id });
        const rating = allReviews.length > 0
            ? parseFloat((allReviews.reduce((a, r) => a + r.rating, 0) / allReviews.length).toFixed(1))
            : 0;
        await Restaurant.findByIdAndUpdate(restaurant._id, { rating, reviewsCount: allReviews.length });
        console.log('  ' + restaurant.name + ' rating: ' + rating + ' (' + allReviews.length + ' reviews)');
    }

    console.log('\nDone! Seeded ' + created + ' reviews');
    await mongoose.disconnect();
}

seed().catch(e => { console.error(e.message); process.exit(1); });
