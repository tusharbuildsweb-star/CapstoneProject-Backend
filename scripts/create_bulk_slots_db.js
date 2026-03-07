const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Restaurant = require('../src/models/Restaurant');
const TimeSlot = require('../src/models/TimeSlot');

function getDatesTillMarch31() {
    const dates = [];
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const endDate = new Date(2026, 2, 31); // March 31, 2026

    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

function distributeCapacity(total) {
    // Arbitrary distribution just to match the total capacity
    return {
        twoSeater: Math.floor(total / 2),
        fourSeater: 0,
        sixSeater: 0,
        groupTable: total % 2
    };
}

async function createSlotsForRestaurant(restaurantName, slotsConfig) {
    const restaurant = await Restaurant.findOne({ name: { $regex: new RegExp(restaurantName, 'i') } });
    if (!restaurant) {
        console.log(`Restaurant not found: ${restaurantName}`);
        return;
    }

    const dates = getDatesTillMarch31();
    console.log(`Creating slots for ${restaurant.name} for ${dates.length} days...`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const d of dates) {
        const dateStr = d.toISOString().split('T')[0];
        // We query by start of day to avoid timezone matching issues
        const startOfDay = new Date(d);
        const endOfDay = new Date(d);
        endOfDay.setHours(23, 59, 59, 999);

        for (const config of slotsConfig) {
            const existing = await TimeSlot.findOne({
                restaurantId: restaurant._id,
                date: { $gte: startOfDay, $lte: endOfDay },
                time: config.time
            });

            if (!existing) {
                await TimeSlot.create({
                    restaurantId: restaurant._id,
                    date: d,
                    time: config.time,
                    capacity: distributeCapacity(config.capacity),
                    isActive: true
                });
                createdCount++;
            } else {
                skippedCount++;
            }
        }
    }
    console.log(`[${restaurant.name}] Created ${createdCount} slots. Skipped ${skippedCount} existing slots.`);
}

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const palmShoreSlots = [
            { time: '11:30 AM', capacity: 25 },
            { time: '03:00 PM', capacity: 30 },
            { time: '08:00 PM', capacity: 40 }
        ];

        const khalidSlots = [
            { time: '12:00 PM', capacity: 20 },
            { time: '04:00 PM', capacity: 25 },
            { time: '09:00 PM', capacity: 35 }
        ];

        await createSlotsForRestaurant('Palm Shore', palmShoreSlots);
        await createSlotsForRestaurant('Khalid', khalidSlots);

        console.log('All db slots operation finished.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
main();
