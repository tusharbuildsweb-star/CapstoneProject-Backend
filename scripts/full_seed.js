const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');
const Restaurant = require('../src/models/Restaurant');
const Review = require('../src/models/Review');
const TimeSlot = require('../src/models/TimeSlot');

dotenv.config();

const restaurantsData = [
    { name: "The Marina", location: "Nungambakkam, Chennai", cuisine: "Seafood", priceRange: "₹₹₹", tables: 15 },
    { name: "Copper Chimney", location: "T. Nagar, Chennai", cuisine: "North Indian", priceRange: "₹₹", tables: 20 },
    { name: "Dakshin", location: "Crowne Plaza, Alwarpet", cuisine: "South Indian", priceRange: "₹₹₹₹", tables: 12 },
    { name: "Azzuri Bay", location: "Kasturba Nagar, Adyar", cuisine: "Mediterranean", priceRange: "₹₹₹", tables: 18 },
    { name: "Benjarong", location: "Alwarpet, Chennai", cuisine: "Thai", priceRange: "₹₹", tables: 14 },
    { name: "Pasta Bar Veneto", location: "Burkit Road, T. Nagar", cuisine: "Italian", priceRange: "₹₹", tables: 25 },
    { name: "Absolute Barbecues", location: "Velachery, Chennai", cuisine: "Barbecue", priceRange: "₹₹", tables: 30 },
    { name: "Little Italy", location: "Besant Nagar, Chennai", cuisine: "Italian (Veg)", priceRange: "₹₹", tables: 20 },
    { name: "Pumpkin Tales", location: "Alwarpet, Chennai", cuisine: "Continental", priceRange: "₹₹₹", tables: 15 },
    { name: "Soy Soi", location: "Kotturpuram, Chennai", cuisine: "Asian", priceRange: "₹₹₹", tables: 12 },
    { name: "The Flying Elephant", location: "Park Hyatt, Guindy", cuisine: "Global", priceRange: "₹₹₹₹", tables: 20 },
    { name: "Savya Rasa", location: "Kotturpuram, Chennai", cuisine: "South Indian", priceRange: "₹₹₹", tables: 10 },
    { name: "Peshawri", location: "ITC Grand Chola, Guindy", cuisine: "North Indian", priceRange: "₹₹₹₹", tables: 15 },
    { name: "Amethyste", location: "The Rain Tree, Anna Salai", cuisine: "Multi-cuisine", priceRange: "₹₹₹", tables: 18 },
    { name: "Cream Centre", location: "R.A. Puram, Chennai", cuisine: "North Indian (Veg)", priceRange: "₹", tables: 40 },
    { name: "Mami's Mess", location: "Mylapore, Chennai", cuisine: "South Indian (Classic)", priceRange: "₹", tables: 10 },
    { name: "Writer's Cafe", location: "Gopalapuram, Chennai", cuisine: "Cafe", priceRange: "₹", tables: 15 },
    { name: "Broken Bridge Cafe", location: "Somerset Greenways, MRC Nagar", cuisine: "Contemporary Indian", priceRange: "₹₹", tables: 22 },
    { name: "Hibiscus", location: "Poes Garden, Chennai", cuisine: "French", priceRange: "₹₹₹", tables: 12 },
    { name: "Eka", location: "Egmore, Chennai", cuisine: "Modern Indian", priceRange: "₹₹₹", tables: 15 }
];

const reviewsPool = [
    "Amazing food and even better service. A must visit!",
    "The ambience was perfect for a date night. Highly recommend the starters.",
    "Best South Indian meal I've had in a long time.",
    "The seafood was incredibly fresh. The Marina never disappoints.",
    "Very busy on weekends, but the wait is worth it.",
    "Authentic flavors and great presentation.",
    "Loved the Italian spread. The pasta was perfectly al dente.",
    "The staff was very attentive and the food arrived quickly.",
    "A bit pricey but the quality is top-notch.",
    "Perfect for a family dinner. Everyone loved it.",
    "The dessert selection is massive!",
    "Great place to host a birthday party.",
    "The signature curry is to die for.",
    "Exquisite dining experience. Every dish told a story.",
    "Comfort food done right.",
    "The views from the terrace were stunning.",
    "Excellent value for money.",
    "Could improve on the seating arrangement, but the food is great.",
    "Friendly staff and warm atmosphere.",
    "The mocktails are very refreshing."
];

const timeSlotsArray = ["12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM"];

async function seed() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log("Connected.");

        // 1. Get or Create Owner
        let owner = await User.findOne({ role: 'owner' });
        if (!owner) {
            console.log("No owner found. Creating a default owner: owner@reserve.com");
            owner = await User.create({
                name: "RESERVE Partner",
                email: "owner@reserve.com",
                password: "Password123!",
                role: "owner"
            });
        }

        const users = await User.find({ role: 'user' }).limit(50);
        if (users.length === 0) {
            console.log("No users found. Please register some users first to seed reviews accurately.");
            // We'll create one dummy user just in case
            const dummyUser = await User.create({
                name: "Dining Expert",
                email: "expert@reserve.com",
                password: "Password123!",
                role: "user"
            });
            users.push(dummyUser);
        }

        console.log("Deleting existing seed data (Restaurants with 'Chennai' in location)...");
        // We only delete restaurants in Chennai to avoid wiping everything
        const existingChennai = await Restaurant.find({ location: /Chennai/ });
        const chennaiIds = existingChennai.map(r => r._id);

        await Restaurant.deleteMany({ _id: { $in: chennaiIds } });
        await Review.deleteMany({ restaurantId: { $in: chennaiIds } });
        await TimeSlot.deleteMany({ restaurantId: { $in: chennaiIds } });

        console.log(`Seeding ${restaurantsData.length} Restaurants...`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date("2026-04-30");

        for (const r of restaurantsData) {
            const restaurant = await Restaurant.create({
                ownerId: owner._id,
                name: r.name,
                location: r.location,
                cuisine: r.cuisine,
                priceRange: r.priceRange,
                tables: r.tables,
                tableConfig: {
                    twoSeaterTables: Math.floor(r.tables * 0.4),
                    fourSeaterTables: Math.floor(r.tables * 0.4),
                    sixSeaterTables: Math.floor(r.tables * 0.15),
                    groupTables: Math.floor(r.tables * 0.05)
                },
                images: ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800"],
                isApproved: true,
                subscriptionStatus: 'active',
                rating: 4.0 + Math.random(),
                workingHours: {
                    weekday: '11:00 AM - 11:00 PM',
                    weekend: '10:00 AM - 12:00 AM'
                },
                contactNumber: "+91 91234 56" + Math.floor(100 + Math.random() * 900),
                email: r.name.toLowerCase().replace(/\s+/g, '') + "@reserve.com"
            });

            // 2. Seed 10 Reviews per restaurant
            for (let i = 0; i < 10; i++) {
                const randomUser = users[Math.floor(Math.random() * users.length)];
                await Review.create({
                    userId: randomUser._id,
                    restaurantId: restaurant._id,
                    rating: 4 + Math.floor(Math.random() * 2), // 4 or 5
                    foodRating: 8 + Math.floor(Math.random() * 3),
                    ambienceRating: 8 + Math.floor(Math.random() * 3),
                    staffRating: 8 + Math.floor(Math.random() * 3),
                    comment: reviewsPool[Math.floor(Math.random() * reviewsPool.length)]
                }).catch(err => {
                    // Unique constraint on userId + restaurantId might trigger
                    // console.log("Skipping duplicate review for user/restaurant");
                });
            }

            // 3. Seed TimeSlots until April 30
            console.log(`Generating slots for ${restaurant.name}...`);
            const slotsToInsert = [];
            let currentDate = new Date(today);

            while (currentDate <= endDate) {
                const dateCopy = new Date(currentDate);
                for (const time of timeSlotsArray) {
                    slotsToInsert.push({
                        restaurantId: restaurant._id,
                        date: dateCopy,
                        time: time,
                        capacity: restaurant.tableConfig,
                        booked: { twoSeater: 0, fourSeater: 0, sixSeater: 0, groupTable: 0 }
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            await TimeSlot.insertMany(slotsToInsert);
        }

        console.log("Seeding Completed Successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Seeding Failed:", err);
        process.exit(1);
    }
}

seed();
