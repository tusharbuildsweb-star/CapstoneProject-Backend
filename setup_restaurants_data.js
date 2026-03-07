const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Models
const User = require('./src/models/User');
const Restaurant = require('./src/models/Restaurant');
const Package = require('./src/models/Package');
const TimeSlot = require('./src/models/TimeSlot');

async function setupRestaurant(email, menuItems, packagesData, tableConfig) {
    try {
        console.log(`Setting up data for ${email}...`);
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

        // 1. Update Menu in Restaurant Model
        // Structure: { "Category": [ { name, price, description, preorderAvailable: true } ] }
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
        restaurant.tables = tableConfig.total;
        await restaurant.save();
        console.log(`Updated menu for ${restaurant.name}.`);

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
        console.log(`Added ${packageDocs.length} packages.`);

        // 3. Create Daily Slots until March 31
        await TimeSlot.deleteMany({ restaurantId });
        const slots = [];
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date('2026-03-31');
        end.setHours(23, 59, 59, 999);

        const slotCap = {
            twoSeater: tableConfig.two,
            fourSeater: tableConfig.four,
            sixSeater: tableConfig.six,
            groupTable: tableConfig.group
        };

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];

            // Morning - 11:30 AM
            slots.push({
                restaurantId,
                date: new Date(dateStr),
                time: '11:30 AM',
                capacity: slotCap,
                isActive: true
            });

            // Afternoon - 3:00 PM
            slots.push({
                restaurantId,
                date: new Date(dateStr),
                time: '3:00 PM',
                capacity: slotCap,
                isActive: true
            });

            // Evening - 8:00 PM
            slots.push({
                restaurantId,
                date: new Date(dateStr),
                time: '8:00 PM',
                capacity: slotCap,
                isActive: true
            });
        }

        await TimeSlot.insertMany(slots);
        console.log(`Created ${slots.length} slots for ${email}.`);

    } catch (err) {
        console.error(`Error setup ${email}:`, err);
    }
}

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const palmShoreMenu = [
            { name: 'Arabian Chicken Mandi', price: 480, description: 'Authentic Arabian rice dish with succulent roasted chicken and traditional spices.' },
            { name: 'Mutton Mandi', price: 620, description: 'Tender mutton served over flavorful mandi rice, slow-cooked to perfection.' },
            { name: 'Grilled Hammour Fish', price: 550, description: 'Fresh hammour fillet grilled with aromatic Arabian charcoal spices.' },
            { name: 'Butter Garlic Prawns', price: 520, description: 'Juicy prawns tossed in a rich butter garlic sauce with a hint of coastal lemon.' },
            { name: 'Chicken Shawarma Platter', price: 320, description: 'Deconstructed chicken shawarma served with pita, hummus, and salad.' },
            { name: 'Fish Fry (Coastal Style)', price: 360, description: 'Crispy pan-fried fish marinated in traditional South Indian coastal spices.' },
            { name: 'Tandoori Prawns', price: 600, description: 'Large prawns marinated in yogurt and tandoori spices, cooked in a clay oven.' },
            { name: 'Malabar Parotta (2 pcs)', price: 80, description: 'Flaky, layered traditional bread perfect for seafood gravies.' },
            { name: 'Seafood Platter', price: 950, description: 'A grand assortment of grilled fish, prawns, and squid with house-special dips.' },
            { name: 'Kunafa Dessert', price: 240, description: 'Traditional Middle Eastern sweet with crispy pastry and warm cheese center.' }
        ];

        const khalidMenu = [
            { name: 'Chicken Dum Biryani', price: 280, description: 'Classic Hyderabadi style slow-cooked dum biryani with tender chicken pieces.' },
            { name: 'Mutton Dum Biryani', price: 360, description: 'Rich and aromatic biryani featuring melt-in-the-mouth mutton cubes.' },
            { name: 'Egg Biryani', price: 220, description: 'Flavorful spiced rice served with boiled eggs and secret masala gravy.' },
            { name: 'Veg Biryani', price: 190, description: 'Seasonal vegetables and premium basmati rice cooked with authentic spices.' },
            { name: 'Chicken 65', price: 240, description: 'Spicy, deep-fried chicken appetizer - a Hyderabadi favorite.' },
            { name: 'Mutton Kebab', price: 320, description: 'Minced mutton skewers seasoned with cloves, cinnamon, and fresh herbs.' },
            { name: 'Double Ka Meetha', price: 140, description: 'Traditional bread pudding dessert soaked in saffron milk and dry fruits.' },
            { name: 'Chicken Haleem', price: 260, description: 'Slow-cooked stew of chicken, grains, and spices, nutritious and flavorful.' },
            { name: 'Tandoori Chicken', price: 380, description: 'Classic oven-roasted chicken with 12-spice marinade and charcoal aroma.' },
            { name: 'Family Pack Chicken Biryani', price: 750, description: 'Value pack serving 4-5 people with generous portions of and salan.' }
        ];

        const standardPackages = [
            {
                title: 'Birthday Celebration',
                type: 'birthday',
                description: 'Celebrate birthdays with customized themed decoration, cake arrangement, music setup, and reserved seating for a memorable experience.',
                basePrice: 4000,
                decorationCost: 2000,
                maxCapacity: 20
            },
            {
                title: 'Corporate Party',
                type: 'corporate',
                description: 'Premium corporate dining setup with curated menu, reserved seating, presentation setup, and dedicated hospitality service.',
                basePrice: 9000,
                decorationCost: 3500,
                maxCapacity: 40
            }
        ];

        await setupRestaurant('adnanmohammed7896@gmail.com', palmShoreMenu, standardPackages, { total: 24, two: 8, four: 8, six: 4, group: 4 });
        await setupRestaurant('thirukumar3210@gmail.com', khalidMenu, standardPackages, { total: 18, two: 6, four: 6, six: 3, group: 3 });

        await mongoose.connection.close();
        console.log('All setup complete.');
    } catch (err) {
        console.error('Run Error:', err);
    }
}

run();
