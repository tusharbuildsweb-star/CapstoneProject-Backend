const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Models
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');
const Package = require('../models/Package');

const cuisines = ['Italian', 'Indian', 'Chinese', 'Japanese', 'Mexican', 'French', 'Mediterranean', 'Thai', 'American', 'Continental'];
const locations = ['Bandra, Mumbai', 'Koramangala, Bangalore', 'Indiranagar, Bangalore', 'Hauz Khas, Delhi', 'Jubilee Hills, Hyderabad', 'Pune Camp, Pune', 'Park Street, Kolkata', 'Anna Nagar, Chennai'];
const priceRanges = ['₹', '₹₹', '₹₹₹', '₹₹₹₹'];

const dishTemplates = {
    'Italian': ['Pasta Carbonara', 'Margherita Pizza', 'Lasagna', 'Risotto', 'Tiramisu', 'Bruschetta', 'Gnocchi', 'Pesto Pasta', 'Focaccia', 'Gelato'],
    'Indian': ['Butter Chicken', 'Paneer Tikka', 'Dal Makhani', 'Biryani', 'Naan', 'Gulab Jamun', 'Chana Masala', 'Aloo Gobi', 'Samosa', 'Mango Lassi'],
    'Chinese': ['Kung Pao Chicken', 'Dim Sum', 'Hakka Noodles', 'Spring Rolls', 'Manchurian', 'Fried Rice', 'Hot and Sour Soup', 'Sweet and Sour Pork', 'Peking Duck', 'Fortune Cookies'],
    'Japanese': ['Sushi Platter', 'Ramen', 'Tempura', 'Teriyaki Chicken', 'Miso Soup', 'Sashimi', 'Udon Noodles', 'Yakitori', 'Matcha Ice Cream', 'Edamame'],
    'Mexican': ['Tacos', 'Burritos', 'Enchiladas', 'Nachos', 'Guacamole', 'Quesadillas', 'Churros', 'Fajitas', 'Chiles Rellenos', 'Salsa & Chips'],
    'French': ['Ratatouille', 'Coq au Vin', 'Bouillabaisse', 'Quiche Lorraine', 'Soufflé', 'Crêpes', 'Escargot', 'Cassoulet', 'Profiteroles', 'Onion Soup'],
    'Mediterranean': ['Hummus', 'Falafel', 'Greek Salad', 'Moussaka', 'Tabbouleh', 'Baklava', 'Shish Tawook', 'Baba Ganoush', 'Shawarma', 'Pita Bread'],
    'Thai': ['Pad Thai', 'Green Curry', 'Tom Yum Soup', 'Mango Sticky Rice', 'Red Curry', 'Som Tum', 'Massaman Curry', 'Spring Rolls Thai', 'Satay', 'Thai Iced Tea'],
    'American': ['Cheeseburger', 'Buffalo Wings', 'BBQ Ribs', 'Apple Pie', 'Mac and Cheese', 'Clam Chowder', 'Hot Dogs', 'Cornbread', 'Steak', 'Pancakes'],
    'Continental': ['Grilled Salmon', 'Roast Chicken', 'Vegetable Au Gratin', 'Steak Diane', 'Fish and Chips', 'Shepherd’s Pie', 'Stuffed Mushrooms', 'Caesar Salad', 'Fruit Tart', 'Club Sandwich']
};

const images = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de'
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB...');

        // Clear existing data (Optional, but safer for a clean demo)
        // await Restaurant.deleteMany({});
        // await Review.deleteMany({});
        // await Package.deleteMany({});

        // Get or Create an owner
        let owner = await User.findOne({ email: 'owner@demo.com' });
        if (!owner) {
            const hashedPassword = await bcrypt.hash('password123', 10);
            owner = await User.create({
                name: 'Demo Owner',
                email: 'owner@demo.com',
                password: hashedPassword,
                role: 'owner',
                isVerified: true
            });
        }

        // Get some users for reviews
        let reviewers = await User.find({ role: 'user' }).limit(10);
        if (reviewers.length < 5) {
            const hashedPassword = await bcrypt.hash('password123', 10);
            for (let i = 0; i < 5; i++) {
                const u = await User.create({
                    name: `Reviewer ${i + 1}`,
                    email: `reviewer${i + 1}@demo.com`,
                    password: hashedPassword,
                    role: 'user',
                    isVerified: true
                });
                reviewers.push(u);
            }
        }

        console.log('Seeding 20 restaurants...');

        for (let i = 1; i <= 20; i++) {
            const cuisine = cuisines[i % cuisines.length];
            const location = locations[i % locations.length];
            const priceRange = priceRanges[i % priceRanges.length];

            // 1. Create Restaurant
            const menu = {};
            const dishes = dishTemplates[cuisine] || dishTemplates['Continental'];
            const categoryName = 'Signature Dishes';
            menu[categoryName] = dishes.map((name, index) => ({
                id: `dish-${i}-${index}`,
                name,
                description: `Delicious ${name} prepared with fresh ingredients.`,
                price: 200 + (index * 50) + (i * 10),
                image: images[index % images.length],
                isAvailable: true
            }));

            const restaurant = await Restaurant.create({
                name: `${cuisine} Royale ${i}`,
                description: `Experience the finest ${cuisine} dining in the heart of ${location.split(',')[0]}. Our chefs bring authentic flavors and a luxurious atmosphere.`,
                location,
                cuisine: cuisine,
                ownerId: owner._id,
                images: [images[i % images.length], images[(i + 1) % images.length]],
                openingHours: {
                    open: '11:00',
                    close: '23:00'
                },
                priceRange,
                menu,
                isApproved: true,
                subscriptionStatus: 'active',
                subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                tableConfig: {
                    twoSeaterTables: 5,
                    fourSeaterTables: 10,
                    sixSeaterTables: 5,
                    groupTables: 2
                },
                tables: 22,
                rating: Number((3.5 + (i % 2) * 1 + (i % 3) * 0.25).toFixed(1))
            });

            // 2. Add 10 Reviews
            const ratingOpts = [3.5, 4.5, 5];
            for (let j = 0; j < 10; j++) {
                const baseRating = ratingOpts[j % 3];
                const foodR = Math.min(10, Math.floor(baseRating * 2) - 1 + (j % 3));
                const ambR = Math.min(10, Math.floor(baseRating * 2) - (j % 2));
                const staffR = Math.min(10, Math.floor(baseRating * 2));

                await Review.create({
                    userId: reviewers[j % reviewers.length]._id,
                    restaurantId: restaurant._id,
                    rating: baseRating,
                    foodRating: foodR,
                    ambienceRating: ambR,
                    staffRating: staffR,
                    comment: `Amazing experience! The ${cuisine} flavors were spot on. Service was ${staffR > 8 ? 'excellent' : 'good'}.`,
                }).catch(e => {
                    // Ignore unique constraint errors if any
                });
            }

            // 3. Add Packages
            // Birthday Packages (4, 6, 8, 10, 20)
            const bdaySizes = [4, 6, 8, 10, 20];
            for (const size of bdaySizes) {
                await Package.create({
                    restaurantId: restaurant._id,
                    title: `Grand Birthday Celebration (${size} Guests)`,
                    type: 'birthday',
                    description: `A complete birthday package for ${size} people including decorations, buffet, and cake setup.`,
                    basePrice: 500 * size,
                    decorationCost: 1000,
                    maxCapacity: size,
                    decorationDetails: 'Balloon decor, themed table setup, and birthday banner.',
                    hasBuffet: true,
                    isAvailable: true
                });
            }

            // Corporate Package
            await Package.create({
                restaurantId: restaurant._id,
                title: 'Professional Corporate Mixer',
                type: 'corporate',
                description: 'Ideal for team outings and meetings. Includes AV setup, buffet lunch, and premium service.',
                basePrice: 800 * 20,
                decorationCost: 2000,
                maxCapacity: 50,
                decorationDetails: 'Professional meeting setup with projectors and sanitized station.',
                hasBuffet: true,
                isAvailable: true
            });

            console.log(`Seeded: ${restaurant.name}`);
        }

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seed();
