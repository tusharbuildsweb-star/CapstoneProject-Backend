const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./src/models/User');
const Restaurant = require('./src/models/Restaurant');
const Package = require('./src/models/Package');
const TimeSlot = require('./src/models/TimeSlot');

async function setupRestaurant(email, menuItems, packagesData) {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            console.log(`User ${email} not found.`);
            return;
        }

        const restaurant = await Restaurant.findOne({ ownerId: user._id });
        if (!restaurant) {
            console.log(`Restaurant for ${email} not found.`);
            return;
        }

        const restaurantId = restaurant._id;

        // 1. Update Menu
        const menuObj = {
            "Main Course": menuItems.map(item => ({
                name: item.name,
                price: item.price,
                description: item.description,
                preorderAvailable: true,
                isAvailable: true
            }))
        };

        restaurant.menu = menuObj;
        await restaurant.save();
        console.log(`Updated menu for ${restaurant.name} (${menuItems.length} items).`);

        // 2. Add Packages
        await Package.deleteMany({ restaurantId });
        const packageDocs = packagesData.map(pkg => ({
            restaurantId,
            title: pkg.title,
            type: pkg.type,
            description: pkg.description,
            basePrice: pkg.basePrice,
            decorationCost: pkg.decorationCost,
            maxCapacity: pkg.maxCapacity,
            isActive: true
        }));
        await Package.insertMany(packageDocs);
        console.log(`Added ${packageDocs.length} packages for ${restaurant.name}.`);

        // 3. Create Daily Slots
        await TimeSlot.deleteMany({ restaurantId });
        const slots = [];
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date('2026-03-31');
        end.setHours(23, 59, 59, 999);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];

            // 11:30 AM - Capacity 25
            slots.push({
                restaurantId,
                date: new Date(dateStr),
                time: '11:30 AM',
                capacity: { total: 25, twoSeater: 5, fourSeater: 5, sixSeater: 0, groupTable: 0 },
                isActive: true
            });

            // 3:00 PM - Capacity 30
            slots.push({
                restaurantId,
                date: new Date(dateStr),
                time: '3:00 PM',
                capacity: { total: 30, twoSeater: 5, fourSeater: 5, sixSeater: 0, groupTable: 0 },
                isActive: true
            });

            // 8:00 PM - Capacity 40
            slots.push({
                restaurantId,
                date: new Date(dateStr),
                time: '8:00 PM',
                capacity: { total: 40, twoSeater: 5, fourSeater: 5, sixSeater: 0, groupTable: 0 },
                isActive: true
            });
        }

        await TimeSlot.insertMany(slots);
        console.log(`Created ${slots.length} slots until March 31 for ${restaurant.name}.`);

    } catch (err) {
        console.error(`Error setup ${email}:`, err);
    }
}

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const palmShoreMenu = [
            { name: 'Arabian Chicken Mandi', price: 480, description: 'Traditional slow-cooked rice with spiced chicken and Arabian flavors.' },
            { name: 'Mutton Mandi', price: 620, description: 'Tender mutton served over aromatic basmati rice.' },
            { name: 'Grilled Hammour Fish', price: 550, description: 'Fresh hammour fish grilled with coastal spices.' },
            { name: 'Butter Garlic Prawns', price: 520, description: 'Juicy prawns sautéed in butter garlic sauce.' },
            { name: 'Chicken Shawarma Platter', price: 320, description: 'Middle Eastern shawarma with dips and pita bread.' },
            { name: 'Fish Fry (Coastal Style)', price: 360, description: 'Crispy fried fish with South Indian masala.' },
            { name: 'Tandoori Prawns', price: 600, description: 'Clay oven grilled prawns with smoky flavor.' },
            { name: 'Malabar Parotta (2 pcs)', price: 80, description: 'Layered flaky Kerala-style bread.' },
            { name: 'Seafood Platter', price: 950, description: 'Assorted grilled seafood selection.' },
            { name: 'Kunafa Dessert', price: 240, description: 'Classic Arabian sweet with cheese and syrup.' }
        ];

        const khalidMenu = [
            { name: 'Chicken Dum Biryani', price: 280, description: 'Authentic Hyderabadi biryani slow cooked with spices.' },
            { name: 'Mutton Dum Biryani', price: 360, description: 'Rich mutton biryani with saffron aroma.' },
            { name: 'Egg Biryani', price: 220, description: 'Fragrant rice with boiled eggs and masala.' },
            { name: 'Veg Biryani', price: 190, description: 'Mixed vegetables cooked in traditional biryani style.' },
            { name: 'Chicken 65', price: 240, description: 'Spicy deep-fried chicken appetizer.' },
            { name: 'Mutton Kebab', price: 320, description: 'Juicy grilled mutton skewers.' },
            { name: 'Double Ka Meetha', price: 140, description: 'Traditional Hyderabadi dessert.' },
            { name: 'Chicken Haleem', price: 260, description: 'Slow-cooked wheat and meat delicacy.' },
            { name: 'Tandoori Chicken', price: 380, description: 'Charcoal grilled chicken with spices.' },
            { name: 'Family Pack Chicken Biryani', price: 750, description: 'Large portion suitable for 4–5 people.' }
        ];

        const packages = [
            {
                title: 'Birthday Celebration',
                type: 'birthday',
                description: 'Private dining area, cake setup, balloon decoration, music support and personalized service for birthday celebrations.',
                basePrice: 4000,
                decorationCost: 2000,
                maxCapacity: 20
            },
            {
                title: 'Corporate Party',
                type: 'corporate',
                description: 'Reserved seating, curated multi-course menu, projector setup, dedicated hospitality support for business gatherings.',
                basePrice: 9000,
                decorationCost: 3500,
                maxCapacity: 40
            }
        ];

        await setupRestaurant('adnanmohammed7896@gmail.com', palmShoreMenu, packages);
        await setupRestaurant('thirukumar3210@gmail.com', khalidMenu, packages);

        console.log('Setup successfully completed.');
        process.exit(0);
    } catch (err) {
        console.error('Run Error:', err);
        process.exit(1);
    }
}

run();
