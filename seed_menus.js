require('dotenv').config();
const mongoose = require('mongoose');
const Restaurant = require('./src/models/Restaurant');

const ZAITOON_MENU = {
    'Starters': [
        { name: 'Hummus & Pita Bread', price: '₹220', description: 'Creamy chickpea hummus served with warm pita triangles and olive oil drizzle.', isAvailable: true, status: 'Active' },
        { name: 'Falafel Bites', price: '₹190', description: 'Crispy herb-spiced chickpea fritters with tahini dipping sauce.', isAvailable: true, status: 'Active' },
        { name: 'Mutton Samosa (4 pcs)', price: '₹180', description: 'Flaky pastry filled with spiced minced mutton and fresh herbs.', isAvailable: true, status: 'Active' },
        { name: 'Stuffed Grape Leaves', price: '₹210', description: 'Tender vine leaves filled with herbed rice and a hint of lemon.', isAvailable: true, status: 'Active' },
    ],
    'Main Course': [
        { name: 'Lamb Mandi', price: '₹650', description: 'Slow-cooked tender lamb on fragrant saffron rice with Yemeni spice blend.', isAvailable: true, status: 'Active' },
        { name: 'Chicken Shawarma Platter', price: '₹380', description: 'Marinated chicken strips served with garlic sauce, pickles, and Arabic bread.', isAvailable: true, status: 'Active' },
        { name: 'Mutton Kebab Platter', price: '₹520', description: 'Seekh kebabs with Persian rub, served with mint chutney and naan.', isAvailable: true, status: 'Active' },
        { name: 'Mixed Grill Platter', price: '₹720', description: 'Selection of chicken, lamb, and kofta kebabs with salads and dips.', isAvailable: true, status: 'Active' },
        { name: 'Vegetarian Mezze Platter', price: '₹320', description: 'A vegan feast of hummus, baba ganoush, tabbouleh, falafel, and pickled olives.', isAvailable: true, status: 'Active' },
    ],
    'Desserts': [
        { name: 'Kunafa', price: '₹240', description: 'Crispy shredded pastry layered with sweet cheese, soaked in rose syrup.', isAvailable: true, status: 'Active' },
        { name: 'Baklava (6 pcs)', price: '₹200', description: 'Flaky phyllo pastry with pistachio, drizzled in honey and orange blossom water.', isAvailable: true, status: 'Active' },
        { name: 'Umm Ali', price: '₹220', description: 'Egyptian bread pudding with nuts, coconut, and cream — served warm.', isAvailable: true, status: 'Active' },
    ],
    'Drinks': [
        { name: 'Jallab Juice', price: '₹120', description: 'Traditional Middle Eastern blend of grape, rose water, and pomegranate.', isAvailable: true, status: 'Active' },
        { name: 'Mint Lemonade', price: '₹100', description: 'Freshly squeezed lemons blended with mint and a hint of sugar.', isAvailable: true, status: 'Active' },
        { name: 'Arabic Qahwa (Coffee)', price: '₹90', description: 'Traditional cardamom-infused Arabic coffee with dates.', isAvailable: true, status: 'Active' },
    ]
};

const ADYAR_BHAVAN_MENU = {
    'Tiffin & Breakfast': [
        { name: 'Masala Dosa', price: '₹80', description: 'Crispy rice crepe with a golden potato-onion masala filling, served with chutneys and sambar.', isAvailable: true, status: 'Active' },
        { name: 'Rava Idli (3 pcs)', price: '₹70', description: 'Soft semolina idlis with cashew and mustard tempering, served with coconut chutney.', isAvailable: true, status: 'Active' },
        { name: 'Medu Vada (2 pcs)', price: '₹60', description: 'Crispy lentil doughnuts served with sambar and tomato chutney.', isAvailable: true, status: 'Active' },
        { name: 'Pongal', price: '₹90', description: 'Traditional Tamil rice-lentil porridge with pepper, cumin, and ghee.', isAvailable: true, status: 'Active' },
        { name: 'Onion Uttapam', price: '₹85', description: 'Thick rice pancake with caramelised onion and green chilli topping.', isAvailable: true, status: 'Active' },
    ],
    'Main Course': [
        { name: 'Sambar Rice', price: '₹110', description: 'Steamed rice served with traditional lentil sambar, papad, and pickle.', isAvailable: true, status: 'Active' },
        { name: 'Curd Rice', price: '₹90', description: 'Tempered yogurt rice with cashew, mustard seeds, and pomegranate.', isAvailable: true, status: 'Active' },
        { name: 'Kerala Veg Meals (Full Plate)', price: '₹180', description: 'Unlimited thali with rice, 3 curries, rasam, sambar, payasam, and papad.', isAvailable: true, status: 'Active' },
        { name: 'Mini Idli Sambar (12 pcs)', price: '₹120', description: 'Miniature idlis dunked in aromatic sambar — a South Indian classic.', isAvailable: true, status: 'Active' },
    ],
    'Street Snacks': [
        { name: 'Bhel Puri', price: '₹70', description: 'Puffed rice tossed with sev, tamarind chutney, onion, and tomato.', isAvailable: true, status: 'Active' },
        { name: 'Pani Puri (6 pcs)', price: '₹60', description: 'Hollow crisp spheres filled with spicy tamarind water and chickpeas.', isAvailable: true, status: 'Active' },
        { name: 'Sev Puri', price: '₹65', description: 'Flat crispies topped with potato, sev, chutneys, and pomegranate.', isAvailable: true, status: 'Active' },
        { name: 'Aloo Tikki Chaat', price: '₹85', description: 'Pan-fried potato patties with yogurt, chutneys, and chaat masala.', isAvailable: true, status: 'Active' },
    ],
    'Desserts': [
        { name: 'Gulab Jamun (3 pcs)', price: '₹80', description: 'Milk-solid dumplings soaked in rose and cardamom syrup.', isAvailable: true, status: 'Active' },
        { name: 'Kheer', price: '₹90', description: 'Creamy rice pudding with saffron, cardamom, and crushed pistachios.', isAvailable: true, status: 'Active' },
        { name: 'Payasam', price: '₹85', description: 'Kerala-style vermicelli payasam with coconut milk and cashews.', isAvailable: true, status: 'Active' },
        { name: 'Jangiri', price: '₹70', description: 'Traditional Tamil sweet made from urad dal, soaked in sugar syrup.', isAvailable: true, status: 'Active' },
    ],
    'Drinks': [
        { name: 'Filter Coffee', price: '₹40', description: 'Traditional South Indian decoction coffee served in a steel tumbler.', isAvailable: true, status: 'Active' },
        { name: 'Masala Chai', price: '₹35', description: 'Ginger-cardamom spiced tea with full-cream milk.', isAvailable: true, status: 'Active' },
        { name: 'Neer More (Buttermilk)', price: '₹45', description: 'Spiced South Indian buttermilk with asafoetida and curry leaves.', isAvailable: true, status: 'Active' },
        { name: 'Fresh Sugarcane Juice', price: '₹50', description: 'Cold-pressed sugarcane with lime and ginger.', isAvailable: true, status: 'Active' },
    ]
};

async function seedMenus() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find restaurants by name (case-insensitive)
        const zaitoon = await Restaurant.findOne({ name: { $regex: /zaitoon/i } });
        const adyarBhavan = await Restaurant.findOne({ name: { $regex: /adyar.*bhavan|adyar bhavan/i } });

        if (!zaitoon) {
            console.log('❌ Zaitoon restaurant NOT found in DB. Check the name.');
        } else {
            zaitoon.menu = ZAITOON_MENU;
            zaitoon.markModified('menu');
            await zaitoon.save();
            console.log(`✅ Menu seeded for Zaitoon (${zaitoon._id})`);
        }

        if (!adyarBhavan) {
            console.log('❌ Adyar Bhavan restaurant NOT found in DB. Check the name.');
            // Show available restaurants
            const allRestaurants = await Restaurant.find({}, 'name _id');
            console.log('Available restaurants:');
            allRestaurants.forEach(r => console.log(`  - "${r.name}" (${r._id})`));
        } else {
            adyarBhavan.menu = ADYAR_BHAVAN_MENU;
            adyarBhavan.markModified('menu');
            await adyarBhavan.save();
            console.log(`✅ Menu seeded for Adyar Bhavan (${adyarBhavan._id})`);
        }

    } catch (err) {
        console.error('❌ Error seeding menus:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

seedMenus();
