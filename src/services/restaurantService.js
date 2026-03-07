const Restaurant = require('../models/Restaurant');
const Package = require('../models/Package');
const Menu = require('../models/Menu');
const TimeSlot = require('../models/TimeSlot');
const Review = require('../models/Review');

class RestaurantService {
    async getAllRestaurants(query) {
        let filter = { isApproved: true, subscriptionStatus: 'active' };

        // 1. Basic Filters
        if (query.location) {
            filter.location = { $regex: query.location, $options: 'i' };
        }
        if (query.cuisine) {
            // Can be comma separated
            const cuisines = query.cuisine.split(',').map(c => new RegExp(c.trim(), 'i'));
            filter.cuisine = { $in: cuisines };
        }
        if (query.crowdLevel) {
            filter.crowdLevel = query.crowdLevel;
        }
        if (query.ambience) {
            const tags = query.ambience.split(',').map(t => new RegExp(t.trim(), 'i'));
            filter.ambienceTags = { $in: tags };
        }
        if (query.features) {
            const features = query.features.split(',').map(f => new RegExp(f.trim(), 'i'));
            filter.facilities = { $in: features };
        }

        // 2. Search String Filter
        if (query.search) {
            filter.$or = [
                { name: { $regex: query.search, $options: 'i' } },
                { cuisine: { $regex: query.search, $options: 'i' } },
                { location: { $regex: query.search, $options: 'i' } }
            ];
        }

        // 3. Advanced Filters
        if (query.minRating) {
            filter.rating = { $gte: Number(query.minRating) };
        }

        if (query.tableSize) {
            // E.g., 'twoSeaterTables', 'fourSeaterTables'
            filter[`tableConfig.${query.tableSize}`] = { $gt: 0 };
        }

        // 4. Find all matching restaurants
        let restaurantsQuery = Restaurant.find(filter);

        // 5. Sorting & Special Filters
        if (query.filter === 'top10') {
            restaurantsQuery = restaurantsQuery.sort({ rating: -1 }).limit(10);
        } else if (query.filter === 'top100') {
            restaurantsQuery = restaurantsQuery.sort({ rating: -1 }).limit(100);
        } else if (query.sort) {
            if (query.sort === 'rating_desc') {
                restaurantsQuery = restaurantsQuery.sort({ rating: -1 });
            }
        } else {
            // Default sort by rating
            restaurantsQuery = restaurantsQuery.sort({ rating: -1 });
        }

        let restaurants = await restaurantsQuery;

        // 6. Packages Filter (requires looking at Package collection)
        if (query.packages === 'true') {
            const restaurantsWithPkgs = await Package.distinct('restaurantId', { isAvailable: true });
            const pIds = restaurantsWithPkgs.map(id => id.toString());
            restaurants = restaurants.filter(r => pIds.includes(r._id.toString()));
            // attach hasPackages flag for frontend
            restaurants = restaurants.map(r => ({ ...r.toObject(), hasPackages: true }));
        }

        // 7. Open Now Filter
        if (query.filter === 'openNow') {
            const now = new Date();
            const day = now.getDay(); // 0 is Sunday, 1-5 is weekday, 6 is Saturday
            const isWeekend = day === 0 || day === 6;
            const currentTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

            const parseTime = (timeStr) => {
                const [time, modifier] = timeStr.split(' ');
                let [hours, minutes] = time.split(':');
                if (hours === '12') hours = '00';
                if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
                return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
            };

            const isOpen = (workingHours) => {
                if (!workingHours) return true; // Default to true if not set
                const range = isWeekend ? workingHours.weekend : workingHours.weekday;
                if (!range || range === 'Closed') return false;

                try {
                    const [start, end] = range.split(' - ');
                    const nowMinutes = parseTime(currentTimeStr);
                    const startMinutes = parseTime(start);
                    const endMinutes = parseTime(end);

                    if (endMinutes < startMinutes) {
                        // Overflow to next day (e.g. 10 PM - 2 AM)
                        return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
                    }
                    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
                } catch (e) {
                    return true;
                }
            };

            restaurants = restaurants.filter(r => isOpen(r.workingHours));
        }

        return restaurants;
    }

    async getFilters() {
        const approvedFilter = { isApproved: true, subscriptionStatus: 'active' };

        const cuisines = await Restaurant.distinct('cuisine', approvedFilter);
        const locations = await Restaurant.distinct('location', approvedFilter);
        const features = await Restaurant.distinct('facilities', approvedFilter);

        return {
            cuisines: cuisines.filter(Boolean).sort(),
            locations: locations.filter(Boolean).sort(),
            features: features.filter(Boolean).sort()
        };
    }

    async searchRestaurants(searchStr) {
        if (!searchStr) return await Restaurant.find({ isApproved: true, subscriptionStatus: 'active' });

        // Find packages that match the search string
        const matchingPackages = await Package.find({
            $or: [
                { title: { $regex: searchStr, $options: 'i' } },
                { description: { $regex: searchStr, $options: 'i' } }
            ]
        }).select('restaurantId');
        const restaurantIdsFromPackages = matchingPackages.map(p => p.restaurantId);

        return await Restaurant.find({
            isApproved: true,
            subscriptionStatus: 'active',
            $or: [
                { name: { $regex: searchStr, $options: 'i' } },
                { cuisine: { $regex: searchStr, $options: 'i' } },
                { location: { $regex: searchStr, $options: 'i' } },
                { _id: { $in: restaurantIdsFromPackages } }
                // Menu items search can be added here if 'menu' is a field in Restaurant model
            ]
        });
    }

    async getOwnerRestaurant(ownerId) {
        const restaurant = await Restaurant.findOne({ ownerId });
        if (!restaurant) throw new Error('Restaurant not found for this owner');
        return restaurant;
    }

    async getRestaurantById(id) {
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) throw new Error('Restaurant not found');

        const packages = await Package.find({ restaurantId: id, isAvailable: true });

        return {
            restaurant,
            packages
        };
    }

    async createRestaurant(ownerId, data) {
        const restaurant = new Restaurant({
            ...data,
            ownerId
        });
        const saved = await restaurant.save();

        // Auto Setup
        await this.populateRestaurantData(saved._id);

        return saved;
    }

    async updateRestaurant(id, ownerId, data) {
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) throw new Error('Restaurant not found');
        if (restaurant.ownerId.toString() !== ownerId.toString()) throw new Error('Not authorized to update this restaurant');

        Object.assign(restaurant, data);
        const updated = await restaurant.save();

        if (global.io) {
            if (data.menu) {
                global.io.emit('menuUpdated', { restaurantId: id });
            }
            global.io.emit('restaurantUpdated', { restaurantId: id });
            global.io.emit('globalUpdate');
        }

        return updated;
    }

    async updateCrowdLevel(id, ownerId, crowdLevel) {
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) throw new Error('Restaurant not found');
        if (restaurant.ownerId.toString() !== ownerId.toString()) throw new Error('Not authorized to update this restaurant');

        restaurant.crowdLevel = crowdLevel;
        const saved = await restaurant.save();
        if (global.io) {
            global.io.emit('globalUpdate');
        }
        return saved;
    }

    async populateRestaurantData(restaurantId) {
        console.log(`Starting population for ${restaurantId}`);
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) return;

        // 1. Generate Menu Items
        const menuCount = await Menu.countDocuments({ restaurantId });
        if (menuCount === 0) {
            const CUISINE_DISHES = {
                'Seafood': [
                    { name: 'Grilled Hammour Fish', category: 'Main Course', price: 550, description: 'Fresh hammour fillet grilled with aromatic Arabian charcoal spices.' },
                    { name: 'Butter Garlic Prawns', category: 'Starters', price: 520, description: 'Juicy prawns tossed in a rich butter garlic sauce.' },
                    { name: 'Seafood Platter', category: 'Main Course', price: 950, description: 'A grand assortment of grilled fish, prawns, and squid.' },
                    { name: 'Fish Fry (Coastal Style)', category: 'Starters', price: 360, description: 'Crispy pan-fried fish marinated in traditional spices.' }
                ],
                'South Indian': [
                    { name: 'Masala Dosa', category: 'Main Course', price: 120, description: 'Crispy rice crepe with a golden potato-onion masala filling.' },
                    { name: 'Mutton Dum Biryani', category: 'Main Course', price: 360, description: 'Classic South Indian style slow-cooked dum biryani.' },
                    { name: 'Medu Vada (2 pcs)', category: 'Starters', price: 80, description: 'Crispy lentil doughnuts served with sambar and chutney.' },
                    { name: 'Filter Coffee', category: 'Drinks', price: 60, description: 'Traditional South Indian decoction coffee.' }
                ],
                'North Indian': [
                    { name: 'Paneer Butter Masala', category: 'Main Course', price: 280, description: 'Creamy cottage cheese in a rich tomato-butter gravy.' },
                    { name: 'Butter Chicken', category: 'Main Course', price: 350, description: 'Classic charcoal-grilled chicken in a creamy tomato sauce.' },
                    { name: 'Dal Makhani', category: 'Main Course', price: 240, description: 'Slow-cooked black lentils with cream and spices.' },
                    { name: 'Garlic Naan', category: 'Breads', price: 70, description: 'Soft leavened bread with garlic and butter.' }
                ],
                'Vegetarian': [
                    { name: 'Veg Thali', category: 'Main Course', price: 350, description: 'A complete meal with multiple veg curries, rice, and bread.' },
                    { name: 'Gobi Manchurian', category: 'Starters', price: 180, description: 'Crispy cauliflower florets in a tangy soy-garlic sauce.' },
                    { name: 'Paneer Tikka', category: 'Starters', price: 220, description: 'Grilled marinated cottage cheese cubes.' }
                ],
                'Modern Indian': [
                    { name: 'Deconstructed Samosa', category: 'Starters', price: 250, description: 'Artisanal interpretation of the classic samosa with mint foam.' },
                    { name: 'Truffle Mushroom Risotto', category: 'Main Course', price: 480, description: 'Creamy Arborio rice with wild mushrooms and truffle oil.' },
                    { name: 'Smoked Dal Bukhara', category: 'Main Course', price: 420, description: 'Iconic slow-cooked black lentils with a smoky twist.' }
                ],
                'Multi Cuisine': [
                    { name: 'Chicken Alfredo Pasta', category: 'Main Course', price: 380, description: 'Creamy white sauce pasta with grilled chicken.' },
                    { name: 'Hakka Noodles', category: 'Main Course', price: 220, description: 'Classic Indo-Chinese stir-fried noodles.' },
                    { name: 'Margherita Pizza', category: 'Main Course', price: 320, description: 'Traditional thin-crust pizza with fresh basil and mozzarella.' }
                ],
                'Asian': [
                    { name: 'Dim Sum Basket (6 pcs)', category: 'Starters', price: 450, description: 'Steamed assorted dumplings with dipping sauces.' },
                    { name: 'Kung Pao Chicken', category: 'Main Course', price: 520, description: 'Spicy stir-fried chicken with peanuts and vegetables.' },
                    { name: 'Pad Thai', category: 'Main Course', price: 480, description: 'Classic Thai stir-fried rice noodles.' }
                ],
                'Italian': [
                    { name: 'Lasagna Alla Bolognese', category: 'Main Course', price: 580, description: 'Traditional layered pasta with rich meat sauce.' },
                    { name: 'Tiramisu', category: 'Desserts', price: 320, description: 'Classic Italian coffee-flavored dessert.' },
                    { name: 'Bruschetta', category: 'Starters', price: 280, description: 'Grilled bread topped with tomato, basil, and olive oil.' }
                ]
            };

            const cuisine = restaurant.cuisine || 'Multi Cuisine';
            let dishes = CUISINE_DISHES[cuisine] || CUISINE_DISHES['Multi Cuisine'];

            // Mix in some global favorites if short
            if (dishes.length < 10) {
                const globalFavorites = [
                    { name: 'Chocolate Lava Cake', category: 'Desserts', price: 220, description: 'Warm cake with a molten chocolate center.' },
                    { name: 'Virgin Mojito', category: 'Drinks', price: 180, description: 'Refreshing lime and mint cooler.' },
                    { name: 'Gulab Jamun (2 pcs)', category: 'Desserts', price: 120, description: 'Warm milk dumplings in saffron syrup.' }
                ];
                dishes = [...dishes, ...globalFavorites];
            }

            await Menu.insertMany(dishes.map(d => ({ ...d, restaurantId })));
        }

        // 2. Generate Packages
        const packageCount = await Package.countDocuments({ restaurantId });
        if (packageCount === 0) {
            const defaultPackages = [
                {
                    restaurantId,
                    title: 'Birthday Celebration Experience',
                    type: 'birthday',
                    description: 'Celebrate your special day with themed decorations, cake arrangement, balloons, and buffet dining.',
                    basePrice: 1000,
                    advanceAmount: 1000,
                    maxCapacity: 20,
                    guestOptions: [
                        { guests: 4, price: 3500 },
                        { guests: 6, price: 5000 },
                        { guests: 8, price: 6500 },
                        { guests: 10, price: 8000 },
                        { guests: 20, price: 15000 }
                    ]
                },
                {
                    restaurantId,
                    title: 'Corporate Dining Experience',
                    type: 'corporate',
                    description: 'Perfect for office teams and corporate gatherings with reserved seating and buffet dining.',
                    basePrice: 1500,
                    advanceAmount: 1500,
                    maxCapacity: 20,
                    guestOptions: [
                        { guests: 6, price: 6000 },
                        { guests: 10, price: 9000 },
                        { guests: 15, price: 12000 },
                        { guests: 20, price: 16000 }
                    ]
                }
            ];
            await Package.insertMany(defaultPackages);
        }

        // 3. Generate Slots
        const slotCount = await TimeSlot.countDocuments({ restaurantId });
        if (slotCount === 0) {
            const slots = [];
            const startDate = new Date();
            const endDate = new Date('2026-04-30');
            const times = [
                { time: '12:00 PM', capacity: 20 },
                { time: '06:00 PM', capacity: 30 },
                { time: '09:00 PM', capacity: 40 }
            ];

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                times.forEach(t => {
                    slots.push({
                        restaurantId,
                        date: new Date(d).setHours(0, 0, 0, 0),
                        time: t.time,
                        capacity: {
                            twoSeater: Math.floor(t.capacity / 4),
                            fourSeater: Math.floor(t.capacity / 4),
                            sixSeater: Math.floor(t.capacity / 4),
                            groupTable: Math.floor(t.capacity / 4)
                        }
                    });
                });
            }
            if (slots.length > 0) {
                await TimeSlot.insertMany(slots, { ordered: false }).catch(e => { });
            }
        }

        // 4. Generate Reviews
        const reviewCount = await Review.countDocuments({ restaurantId });
        if (reviewCount === 0) {
            const reviews = [];
            const comments = [
                "Amazing dining experience. Food quality and ambience were excellent.",
                "Loved the vibe here! The service was top-notch.",
                "Great food, but a bit crowded during weekends.",
                "The best biryani in town! Highly recommend.",
                "Beautiful rooftop seating and great cocktails.",
                "Perfect for family dinners. Very kids friendly.",
                "The packages are very well thought out. Had a blast!",
                "Staff was extremely polite and helpful.",
                "A bit on the expensive side but worth every penny.",
                "Classic taste and consistent quality."
            ];
            const ratings = [4.0, 4.5, 5.0, 4.0, 4.5, 5.0, 4.5, 4.0, 5.0, 4.5];

            for (let i = 0; i < 10; i++) {
                reviews.push({
                    restaurantId,
                    userName: `Customer ${i + 1}`,
                    rating: ratings[i],
                    foodRating: Math.floor(ratings[i] * 2),
                    ambienceRating: Math.floor(ratings[i] * 2),
                    staffRating: Math.floor(ratings[i] * 2),
                    comment: comments[i],
                    profileImage: 'https://randomuser.me/api/portraits/men/32.jpg'
                });
            }
            await Review.insertMany(reviews);
            // Update overall rating
            restaurant.rating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        }

        // 5. Update Profile Details
        if (!restaurant.contactNumber) restaurant.contactNumber = '+91 98765 43210';
        if (!restaurant.email) restaurant.email = `info@${restaurant.name.toLowerCase().replace(/\s/g, '')}.com`;
        if (!restaurant.images?.length) {
            restaurant.images = ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4'];
        }
        if (!restaurant.ambienceTags?.length) {
            restaurant.ambienceTags = ['Family Dining', 'Romantic', 'Luxury Dining'];
        }
        if (!restaurant.workingHours?.weekday) {
            restaurant.workingHours = {
                weekday: '11:00 AM - 11:00 PM',
                weekend: '10:00 AM - 12:00 AM'
            };
        }
        if (restaurant.city !== 'Chennai') restaurant.city = 'Chennai';

        try {
            await restaurant.save();
        } catch (saveError) {
            console.error(`Failed to save restaurant ${restaurant.name}:`, saveError.message);
            if (saveError.errors) {
                Object.keys(saveError.errors).forEach(key => {
                    console.error(`- ${key}: ${saveError.errors[key].message}`);
                });
            }
            throw saveError;
        }

        if (global.io) {
            global.io.emit('globalUpdate', { restaurantId });
        }

        return true;
    }
}

module.exports = new RestaurantService();
