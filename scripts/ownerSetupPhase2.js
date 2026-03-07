/**
 * Phase 2 – Full Owner Dashboard Setup Automation
 * Logs in as each owner and creates menu items, packages, and daily slots via API
 * Run: node scripts/ownerSetupPhase2.js
 */

const http = require('http');

const BASE = 'http://localhost:5000';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function request(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: 'localhost', port: 5000, path, method,
            headers: {
                'Content-Type': 'application/json',
                ...(data && { 'Content-Length': Buffer.byteLength(data) }),
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };
        const req = http.request(opts, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch { resolve({ status: res.statusCode, body: raw }); }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function login(email, password) {
    const res = await request('POST', '/api/v1/auth/login', { email, password });
    if (res.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
    return res.body.token;
}

async function getMyRestaurant(token) {
    const res = await request('GET', '/api/v1/restaurants/owner/me', null, token);
    if (res.status !== 200) throw new Error(`Could not fetch restaurant: ${JSON.stringify(res.body)}`);
    return res.body; // { _id, name, menu, ... }
}

async function saveMenu(restaurantId, token, menuItems) {
    // Menu is a Mixed field keyed by category, each category is an array of { name, price, isAvailable }
    // We'll store all items under one category "Main Menu"
    const menu = { 'Main Menu': menuItems.map(item => ({ ...item, isAvailable: true })) };
    const res = await request('PUT', `/api/v1/restaurants/${restaurantId}`, { menu }, token);
    if (res.status !== 200) throw new Error(`Menu save failed: ${JSON.stringify(res.body)}`);
    return res.body;
}

async function createPackage(token, packageData) {
    const res = await request('POST', '/api/v1/packages', packageData, token);
    if (res.status !== 201) throw new Error(`Package creation failed: ${JSON.stringify(res.body)}`);
    return res.body;
}

async function createSlot(token, slotData) {
    const res = await request('POST', '/api/v1/owner/slots', slotData, token);
    if (res.status !== 201 && res.status !== 200) {
        // Slot may already exist (duplicate) – that's OK
        if (res.body?.message?.toLowerCase().includes('duplicate') || res.body?.message?.toLowerCase().includes('exists')) {
            return null; // skip silently
        }
        throw new Error(`Slot creation failed: ${JSON.stringify(res.body)}`);
    }
    return res.body;
}

function getDatesUntilMarch31() {
    const dates = [];
    const today = new Date();
    const end = new Date('2026-03-31');
    for (let d = new Date(today); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]); // YYYY-MM-DD
    }
    return dates;
}

// ─── Setup Data ───────────────────────────────────────────────────────────────
const owners = [
    {
        name: 'Chinese Wok',
        email: 'sabeerreigns@gmail.com',
        password: 'feebcfdc',
        menuItems: [
            { name: 'Veg Fried Rice', price: 220 },
            { name: 'Chicken Fried Rice', price: 260 },
            { name: 'Veg Noodles', price: 210 },
            { name: 'Chicken Noodles', price: 250 },
            { name: 'Gobi Manchurian', price: 240 },
            { name: 'Chilli Paneer', price: 260 },
            { name: 'Dragon Chicken', price: 320 },
            { name: 'Sweet Corn Soup', price: 180 },
            { name: 'Hot & Sour Soup', price: 190 },
            { name: 'Schezwan Chicken', price: 340 }
        ],
        packages: [
            {
                title: 'Birthday Dining Experience',
                description: 'Private decorated table setup with balloons, cake arrangement, and customized dining experience for up to 10 guests.',
                price: 2500,
                decorationCost: 1500,
                maxPeople: 10
            },
            {
                title: 'Corporate Team Dinner',
                description: 'Premium group dining with reserved seating and pre-planned multi-course menu for corporate gatherings.',
                price: 5000,
                decorationCost: 2000,
                maxPeople: 20
            }
        ],
        slots: [
            { time: '11:00', capacity: { twoSeater: 5, fourSeater: 5, sixSeater: 3, groupTable: 2 } },
            { time: '14:00', capacity: { twoSeater: 6, fourSeater: 6, sixSeater: 4, groupTable: 3 } },
            { time: '19:00', capacity: { twoSeater: 8, fourSeater: 8, sixSeater: 5, groupTable: 4 } }
        ]
    },
    {
        name: 'Adyar Bhavan',
        email: 'sabeeranwermeeran@gmail.com',
        password: 'ff8229dc',
        menuItems: [
            { name: 'Plain Dosa', price: 80 },
            { name: 'Masala Dosa', price: 110 },
            { name: 'Ghee Roast', price: 140 },
            { name: 'Idli (2 pcs)', price: 50 },
            { name: 'Pongal', price: 90 },
            { name: 'Vada (2 pcs)', price: 60 },
            { name: 'Mini Tiffin', price: 180 },
            { name: 'Meals (South Indian Thali)', price: 220 },
            { name: 'Filter Coffee', price: 40 },
            { name: 'Sweet Pongal', price: 100 }
        ],
        packages: [
            {
                title: 'Birthday Celebration – South Indian Style',
                description: 'Traditional birthday celebration with banana leaf serving and customized dessert arrangements.',
                price: 2000,
                decorationCost: 1200,
                maxPeople: 15
            },
            {
                title: 'Corporate Lunch',
                description: 'Group corporate lunch with full-course South Indian meals and reserved seating.',
                price: 4500,
                decorationCost: 1500,
                maxPeople: 25
            }
        ],
        slots: [
            { time: '08:00', capacity: { twoSeater: 8, fourSeater: 8, sixSeater: 5, groupTable: 4 } },
            { time: '13:00', capacity: { twoSeater: 9, fourSeater: 9, sixSeater: 6, groupTable: 4 } },
            { time: '20:00', capacity: { twoSeater: 10, fourSeater: 10, sixSeater: 7, groupTable: 5 } }
        ]
    }
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function setupOwner(owner) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🏪  Setting up: ${owner.name}`);
    console.log(`${'═'.repeat(60)}`);

    // 1. Login
    console.log(`\n🔐 Logging in as ${owner.email}...`);
    const token = await login(owner.email, owner.password);
    console.log('   ✅ Login successful');

    // 2. Get restaurant
    const restaurant = await getMyRestaurant(token);
    const restaurantId = restaurant._id;
    console.log(`   🏠 Restaurant ID: ${restaurantId} (${restaurant.name})`);

    // 3. Save menu
    console.log(`\n🍽️  Adding ${owner.menuItems.length} menu items...`);
    await saveMenu(restaurantId, token, owner.menuItems);
    owner.menuItems.forEach(item => console.log(`   + ${item.name} – ₹${item.price}`));
    console.log('   ✅ Menu saved');

    // 4. Create packages
    console.log(`\n🎉 Creating ${owner.packages.length} packages...`);
    for (const pkg of owner.packages) {
        await createPackage(token, { ...pkg, restaurantId });
        console.log(`   + ${pkg.title} (₹${pkg.price} base, ₹${pkg.decorationCost} decoration, max ${pkg.maxPeople})`);
    }
    console.log('   ✅ Packages created');

    // 5. Create daily slots
    const dates = getDatesUntilMarch31();
    console.log(`\n📅 Creating slots for ${dates.length} days (${dates[0]} to ${dates[dates.length - 1]})...`);
    let slotCount = 0;
    let skipped = 0;
    for (const date of dates) {
        for (const slot of owner.slots) {
            const result = await createSlot(token, {
                restaurantId,
                date,
                time: slot.time,
                capacity: slot.capacity,
                isActive: true
            });
            if (result) slotCount++;
            else skipped++;
        }
    }
    console.log(`   ✅ ${slotCount} slots created, ${skipped} skipped (already exist)`);

    console.log(`\n🎯 ${owner.name} is fully set up!`);
}

async function main() {
    console.log('🚀 Phase 2 – Owner Dashboard Full Setup Automation\n');

    for (const owner of owners) {
        try {
            await setupOwner(owner);
        } catch (err) {
            console.error(`\n❌ ERROR setting up ${owner.name}:`, err.message);
        }
    }

    console.log('\n\n✅ Phase 2 Complete! Both restaurants are fully configured.');
    console.log('   → Public listing: http://localhost:5173/restaurants');
    console.log('   → Admin Dashboard: http://localhost:5173/dashboard/admin');
}

main();
