const API_URL = 'http://localhost:5000/api/v1';

const palmShoreOwner = { email: 'adnanmohammed7896@gmail.com', password: 'ecb111d0' };
const khalidOwner = { email: 'thiru3210@gmail.com', password: '263087b3' };

async function loginAndGetToken(credentials) {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    return data.token;
}

async function getRestaurant(token) {
    const res = await fetch(`${API_URL}/restaurants/owner/me`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch restaurant');
    return data;
}

async function getSlots(token, restaurantId, date) {
    const res = await fetch(`${API_URL}/owner/slots?restaurantId=${restaurantId}&date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch slots');
    return data;
}

async function createSlot(token, payload) {
    const res = await fetch(`${API_URL}/owner/slots`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create slot');
    return data;
}

function getDatesTillMarch31() {
    const dates = [];
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const endDate = new Date(2026, 2, 31); // March 31, 2026

    while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

async function processRestaurant(owner, slotsConfig) {
    try {
        console.log(`\nLogging in as ${owner.email}...`);
        const token = await loginAndGetToken(owner);
        const restaurant = await getRestaurant(token);
        console.log(`Successfully logged in. Restaurant: ${restaurant.name}`);

        const dates = getDatesTillMarch31();
        console.log(`Processing slots for ${dates.length} days until March 31...`);

        for (const date of dates) {
            // Get existing slots for the date
            const existingSlots = await getSlots(token, restaurant._id, date);
            const existingTimes = existingSlots.map(s => s.time);

            for (const config of slotsConfig) {
                if (!existingTimes.includes(config.time)) {
                    await createSlot(token, {
                        restaurantId: restaurant._id,
                        date: date,
                        time: config.time,
                        capacity: config.capacity
                    });
                    console.log(`[${restaurant.name}] Created slot: ${date} ${config.time} (Cap: ${config.capacity})`);
                } else {
                    console.log(`[${restaurant.name}] Skipped slot (already exists): ${date} ${config.time}`);
                }
            }
        }
        console.log(`Finished processing for ${restaurant.name}.`);
    } catch (error) {
        console.error(`Error processing ${owner.email}:`, error.response?.data || error.message);
    }
}

async function main() {
    console.log('Starting Auto Create Slots Script...');

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

    await processRestaurant(palmShoreOwner, palmShoreSlots);
    await processRestaurant(khalidOwner, khalidSlots);

    console.log('\nAll slots created successfully!');
}

main();
