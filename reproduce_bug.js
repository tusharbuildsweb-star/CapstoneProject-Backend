const mongoose = require('mongoose');
const User = require('./src/models/User');
const authService = require('./src/services/authService');
const dotenv = require('dotenv');

dotenv.config();

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const email = 'adnanmohammed7896@gmail.com';
        console.log('Testing forgotPassword for:', email);

        const result = await authService.forgotPassword(email);
        console.log('Result:', result);
    } catch (err) {
        console.error('ERROR MESSAGE:', err.message);
        console.error('STACK:', err.stack);
    } finally {
        await mongoose.disconnect();
    }
}

test();
