const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const dropIndex = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('reviews');

        console.log('Dropping index: userId_1_restaurantId_1');
        await collection.dropIndex('userId_1_restaurantId_1').catch(err => {
            console.log('Index might not exist or already dropped:', err.message);
        });

        console.log('Index drop operation finished.');
        process.exit(0);
    } catch (err) {
        console.error('Error dropping index:', err);
        process.exit(1);
    }
};

dropIndex();
