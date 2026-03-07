/**
 * Submit 4 Restaurant Partner Applications via the backend API
 * Uses the same endpoint as the /become-partner form
 * Run: node scripts/submitPartnerApplications.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';

const restaurants = [
    {
        ownerName: 'S. Raghavan',
        email: '21617117@velsuniv.ac.in',
        phone: '9876543210',
        restaurantName: 'Adyar Bhavan',
        cuisine: 'South Indian Traditional',
        location: '18 LB Road, Adyar, Chennai, Tamil Nadu 600020',
        tables: 12,
        facilities: 'Valet Parking, AC Hall, Family Seating, Pure Veg Kitchen',
        description: 'Adyar Bhavan is a refined South Indian vegetarian restaurant offering authentic Tamil cuisine including dosas, idlis, pongal, and filter coffee. The interiors blend traditional heritage with modern family dining comfort.',
        images: [
            'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800',
            'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800',
            'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=800'
        ]
    },
    {
        ownerName: 'Thirunavukkarasu M',
        email: 'thiru3210@gmail.com',
        phone: '9123456780',
        restaurantName: 'Chinese Wok',
        cuisine: 'Indo-Chinese & Asian Fusion',
        location: '120 Velachery Main Road, Chennai, Tamil Nadu 600042',
        tables: 14,
        facilities: 'Live Kitchen, AC Dining, Private Booths, Takeaway Counter',
        description: 'Chinese Wok delivers vibrant Indo-Chinese cuisine with wok-fried specialties, bold sauces, and contemporary Asian-inspired interiors ideal for modern dining.',
        images: [
            'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
            'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
            'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800'
        ]
    },
    {
        ownerName: 'Vairavan Thiagarajan',
        email: 'vairavanthiagarajan@gmail.com',
        phone: '9345678123',
        restaurantName: 'Pind',
        cuisine: 'North Indian Punjabi Cuisine',
        location: '55 Anna Nagar West, Chennai, Tamil Nadu 600040',
        tables: 15,
        facilities: 'Tandoor Kitchen, Private Rooms, Valet Parking, Family Dining',
        description: 'Pind brings the authentic flavors of Punjab with rich curries, tandoor specialties, and rustic village-style interiors offering a premium North Indian culinary experience.',
        images: [
            'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=800',
            'https://images.unsplash.com/photo-1559847844-d721426d6edc?w=800',
            'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800'
        ]
    },
    {
        ownerName: 'Vairavan T',
        email: 'vairavanthiagarajanwork@gmail.com',
        phone: '9786543210',
        restaurantName: 'Zaitoon',
        cuisine: 'Arabian & Middle Eastern Cuisine',
        location: '22 OMR Road, Thoraipakkam, Chennai, Tamil Nadu 600097',
        tables: 16,
        facilities: 'Arabic Majlis Seating, Private Dining, Valet Parking, Family Area',
        description: 'Zaitoon offers an authentic Middle Eastern dining experience featuring mandi, shawarma, Arabian grills, and traditional majlis-style interiors designed for premium family dining.',
        images: [
            'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
            'https://images.unsplash.com/photo-1625944525533-473f1f99c6d8?w=800',
            'https://images.unsplash.com/photo-1562967916-eb82221dfb36?w=800'
        ]
    }
];

function postJSON(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: 'localhost',
            port: 5000,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(responseData) });
                } catch {
                    resolve({ status: res.statusCode, body: responseData });
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function submitAll() {
    console.log('🍽️  Submitting 4 Restaurant Partner Applications...\n');

    for (let i = 0; i < restaurants.length; i++) {
        const r = restaurants[i];
        console.log(`[${i + 1}/4] Submitting: ${r.restaurantName} (${r.email})`);

        try {
            // Send images as comma-separated string — backend splits it on commas
            const payload = {
                ownerName: r.ownerName,
                email: r.email,
                phone: r.phone,
                restaurantName: r.restaurantName,
                cuisine: r.cuisine,
                location: r.location,
                tables: r.tables,
                facilities: r.facilities,
                description: r.description,
                images: r.images.join(',')   // Backend: req.body.images.split(',')
            };

            const result = await postJSON('/api/v1/owner/apply', payload);

            if (result.status === 201) {
                console.log(`  ✅ SUCCESS — Application submitted for ${r.restaurantName}`);
                console.log(`     Status: ${result.body.status || 'pending'}\n`);
            } else if (result.status === 400 && result.body?.message?.includes('already been submitted')) {
                console.log(`  ⚠️  SKIPPED — Application for ${r.email} already exists\n`);
            } else {
                console.log(`  ❌ FAILED (HTTP ${result.status}):`, result.body?.message || result.body);
                console.log();
            }
        } catch (err) {
            console.log(`  ❌ ERROR: ${err.message}\n`);
        }
    }

    console.log('✅ Done! Check Admin Dashboard to review and approve the applications.');
    console.log('   URL: http://localhost:5173/dashboard/admin');
}

submitAll();
