const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Restaurant = require('../src/models/Restaurant');
const Review = require('../src/models/Review');
const TimeSlot = require('../src/models/TimeSlot');
const User = require('../src/models/User');

dotenv.config();

const CHENNAI_RESTAURANTS = [
    { name: 'Adyar Bhavan', cuisine: 'South Indian Veg', location: 'Adyar, Chennai', priceRange: '₹₹', rating: 4.5 },
    { name: 'Palm Shore', cuisine: 'Arabian & Sea Food', location: 'Ramapuram, Chennai', priceRange: '₹₹₹', rating: 4.2 },
    { name: 'Annalakshmi', cuisine: 'Brahminical Veg', location: 'Egmore, Chennai', priceRange: '₹₹₹', rating: 4.8 },
    { name: 'The Marina', cuisine: 'Sea Food', location: 'Nungambakkam, Chennai', priceRange: '₹₹₹₹', rating: 4.6 },
    { name: 'French Royale', cuisine: 'French & Continental', location: 'Besant Nagar, Chennai', priceRange: '₹₹₹₹', rating: 4.4 },
    { name: 'Copper Kitchen', cuisine: 'Chettinad & Tandoori', location: 'Porur, Chennai', priceRange: '₹₹', rating: 4.3 },
    { name: 'Barbeque Nation', cuisine: 'Barbeque & Buffet', location: 'T. Nagar, Chennai', priceRange: '₹₹₹', rating: 4.5 },
    { name: 'Coal Barbecues', cuisine: 'Buffet', location: 'Velachery, Chennai', priceRange: '₹₹₹', rating: 4.4 },
    { name: 'Absolute Barbecue', cuisine: 'Barbeque', location: 'Chromepet, Chennai', priceRange: '₹₹₹', rating: 4.5 },
    { name: 'The Flying Elephant', cuisine: 'Multi-cuisine Luxury', location: 'Guindy, Chennai', priceRange: '₹₹₹₹', rating: 4.7 },
    { name: 'Bay View', cuisine: 'Coastal Dining', location: 'Kovalam, Chennai', priceRange: '₹₹₹₹', rating: 4.6 },
    { name: 'Southern Spice', cuisine: 'Traditional South Indian', location: 'Nungambakkam, Chennai', priceRange: '₹₹₹₹', rating: 4.9 },
    { name: 'The Reef', cuisine: 'International Buffet', location: 'Teynampet, Chennai', priceRange: '₹₹₹', rating: 4.4 },
    { name: 'Sunset Grill', cuisine: 'Grill & Rooftop', location: 'Mount Road, Chennai', priceRange: '₹₹₹', rating: 4.3 },
    { name: 'Madras Pavilion', cuisine: 'Luxury Buffet', location: 'Guindy, Chennai', priceRange: '₹₹₹₹', rating: 4.7 },
    { name: 'Dakshin', cuisine: 'South Indian Fine Dine', location: 'Alwarpet, Chennai', priceRange: '₹₹₹₹', rating: 4.8 },
    { name: 'The Waterfall Restaurant', cuisine: 'Themed Dining', location: 'Vadapalani, Chennai', priceRange: '₹₹', rating: 4.2 },
    { name: 'Sangeetha Veg', cuisine: 'Veg Fast Food', location: 'Mylapore, Chennai', priceRange: '₹', rating: 4.1 },
    { name: 'Kumarakom', cuisine: 'Kerala Cuisine', location: 'Nungambakkam, Chennai', priceRange: '₹₹', rating: 4.3 },
    { name: 'Murugan Idli Shop', cuisine: 'Idli Specials', location: 'Besant Nagar, Chennai', priceRange: '₹', rating: 4.5 }
];

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Manage dummy users for reviews
        let dummyUsers = [];
        for (let i = 1; i <= 10; i++) {
            let user = await User.findOneAndUpdate(
                { email: `user${i}@reserve.com` },
                {
                    name: `Diner ${i}`,
                    password: 'Password@123',
                    role: 'user'
                },
                { upsert: true, new: true }
            );
            dummyUsers.push(user._id);
        }

        let owner = await User.findOne({ role: 'owner' });
        if (!owner) owner = await User.findOne({ role: 'admin' });
        if (!owner) throw new Error('No owner or admin found');

        const April30 = new Date('2026-04-30');
        const now = new Date();

        for (const resData of CHENNAI_RESTAURANTS) {
            console.log(`Seeding ${resData.name}...`);

            const restaurant = await Restaurant.findOneAndUpdate(
                { name: resData.name },
                {
                    ...resData,
                    ownerId: owner._id,
                    isApproved: true,
                    subscriptionStatus: 'active',
                    subscriptionExpiresAt: new Date('2027-01-01'),
                    contactNumber: `+91 ${Math.floor(7000000000 + Math.random() * 2999999999)}`,
                    email: `info@${resData.name.toLowerCase().replace(/\s/g, '')}.com`,
                    workingHours: {
                        weekday: '11:00 AM - 10:30 PM',
                        weekend: '11:00 AM - 11:30 PM'
                    },
                    facilities: ['AC', 'Parking', 'WiFi', 'Card Payment'],
                    tableConfig: {
                        twoSeaterTables: 10,
                        fourSeaterTables: 10,
                        sixSeaterTables: 5,
                        groupTables: 2
                    }
                },
                { upsert: true, new: true }
            );

            // Add 10 Reviews (one per dummy user)
            for (let i = 0; i < 10; i++) {
                const comment = [
                    "Exceptional food and service!", "Loved the ambience.", "A must visit in Chennai.",
                    "Great for family dinners.", "The cuisine is very authentic.", "Bit crowded but worth it.",
                    "Best dining experience recently.", "Affordable prices for such quality.", "Delicious starters.",
                    "Everything was perfect."
                ][i];

                await Review.findOneAndUpdate(
                    { userId: dummyUsers[i], restaurantId: restaurant._id },
                    {
                        rating: [3.5, 4, 4.5, 5][Math.floor(Math.random() * 4)],
                        comment,
                        profileImage: 'https://randomuser.me/api/portraits/men/45.jpg'
                    },
                    { upsert: true }
                );
            }

            // Generate Slots
            let current = new Date(now);
            current.setHours(0, 0, 0, 0);
            const times = ['12:00 PM', '6:00 PM', '9:00 PM'];

            while (current <= April30) {
                for (const time of times) {
                    await TimeSlot.findOneAndUpdate(
                        { restaurantId: restaurant._id, date: new Date(current), time },
                        {
                            isActive: true,
                            capacity: { twoSeater: 10, fourSeater: 10, sixSeater: 5, group: 2 },
                            booked: { twoSeater: 0, fourSeater: 0, sixSeater: 0, group: 0 }
                        },
                        { upsert: true }
                    );
                }
                current.setDate(current.getDate() + 1);
            }
        }

        console.log('Seeding completed successfully');
        process.exit();
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
};

seedData();
