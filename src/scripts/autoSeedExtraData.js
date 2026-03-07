const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Models
const Restaurant = require('../models/Restaurant');
const TimeSlot = require('../models/TimeSlot');
const Package = require('../models/Package');

const seedExtraData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB...');

        const restaurants = await Restaurant.find();
        console.log(`Processing ${restaurants.length} restaurants...`);

        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date('2026-04-15');
        endDate.setHours(0, 0, 0, 0);

        for (const restaurant of restaurants) {
            console.log(`--------------------------------------------------`);
            console.log(`Restaurant: ${restaurant.name} (${restaurant._id})`);

            // 1. Generate Slots
            let dateCursor = new Date(startDate);
            let slotsCreated = 0;

            while (dateCursor <= endDate) {
                const slotsToCreate = [
                    { time: '12:00 PM', total: 20 },
                    { time: '06:00 PM', total: 30 },
                    { time: '09:00 PM', total: 40 }
                ];

                for (const s of slotsToCreate) {
                    const capacity = {
                        twoSeater: Math.floor(s.total * 0.4),
                        fourSeater: Math.floor(s.total * 0.4),
                        sixSeater: Math.floor(s.total * 0.15),
                        groupTable: Math.floor(s.total * 0.05)
                    };

                    try {
                        // Check for duplicate
                        const existing = await TimeSlot.findOne({
                            restaurantId: restaurant._id,
                            date: dateCursor,
                            time: s.time
                        });

                        if (!existing) {
                            await TimeSlot.create({
                                restaurantId: restaurant._id,
                                date: new Date(dateCursor),
                                time: s.time,
                                capacity,
                                booked: { twoSeater: 0, fourSeater: 0, sixSeater: 0, groupTable: 0 },
                                isActive: true
                            });
                            slotsCreated++;
                        }
                    } catch (err) {
                        // Probably index collision, skip
                    }
                }
                dateCursor.setDate(dateCursor.getDate() + 1);
            }
            console.log(`Created ${slotsCreated} slots.`);

            // 2. Generate Packages
            const packagesData = [
                {
                    title: 'Birthday Celebration Experience',
                    type: 'birthday',
                    description: 'Celebrate your special day with a premium birthday dining experience. The package includes themed table decoration, balloons, birthday cake arrangement, personalized table service, and a buffet dining experience.',
                    basePrice: 3500, // Default base price (will show options in frontend)
                    maxCapacity: 20,
                    decorationCost: 1000,
                    decorationDetails: 'Balloon decoration, Birthday banner, Table floral setup, Cake arrangement table',
                    hasBuffet: true,
                    advanceRequired: 1000,
                    guestOptions: [
                        { guests: 4, price: 3500 },
                        { guests: 6, price: 5000 },
                        { guests: 8, price: 6500 },
                        { guests: 10, price: 8000 },
                        { guests: 20, price: 15000 }
                    ]
                },
                {
                    title: 'Corporate Party Experience',
                    type: 'corporate',
                    description: 'Perfect for team gatherings and corporate celebrations. Includes reserved seating, buffet dining, beverage service, and dedicated staff support.',
                    basePrice: 6000,
                    maxCapacity: 20,
                    decorationCost: 1500,
                    decorationDetails: 'Reserved seating section, Corporate buffet menu, Beverage service, Dedicated service staff',
                    hasBuffet: true,
                    advanceRequired: 1500,
                    guestOptions: [
                        { guests: 6, price: 6000 },
                        { guests: 10, price: 9000 },
                        { guests: 15, price: 12000 },
                        { guests: 20, price: 16000 }
                    ]
                }
            ];

            for (const pkg of packagesData) {
                const existing = await Package.findOne({ restaurantId: restaurant._id, title: pkg.title });
                if (!existing) {
                    await Package.create({
                        restaurantId: restaurant._id,
                        title: pkg.title,
                        type: pkg.type,
                        description: pkg.description,
                        basePrice: pkg.basePrice,
                        decorationCost: pkg.decorationCost,
                        maxCapacity: pkg.maxCapacity,
                        decorationDetails: pkg.decorationDetails,
                        hasBuffet: pkg.hasBuffet,
                        isAvailable: true
                    });
                    console.log(`Created package: ${pkg.title}`);
                }
            }
        }

        console.log('Seeding completed!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedExtraData();
