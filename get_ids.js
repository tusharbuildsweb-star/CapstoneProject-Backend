const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config();

// Import models
const OwnerApplication = require('./src/models/OwnerApplication');

async function getAppIds() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');
        const apps = await OwnerApplication.find({
            email: { $in: ['adnanmohammed7896@gmail.com', 'thirukumar3210@gmail.com'] }
        });
        console.log(JSON.stringify(apps));
        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

getAppIds();
