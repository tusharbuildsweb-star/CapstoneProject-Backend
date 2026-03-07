const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();
const User = require('./src/models/User');

async function createTestUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const email = 'arjun.mehta.test@gmail.com';
        const passwordPlain = 'Reserve@123';

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            console.log('User already exists, updating password...');
        } else {
            console.log('Creating new user Arjun Mehta...');
            user = new User({
                name: 'Arjun Mehta',
                email: email,
                role: 'user',
                phone: '9876543210' // some random phone if required
            });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(passwordPlain, salt);

        await user.save();

        console.log('=============================');
        console.log('Test User Created Successfully');
        console.log(`Email: ${email}`);
        console.log(`Password: ${passwordPlain}`);
        console.log('Password is securely hashed.');
        console.log('=============================');

        process.exit(0);
    } catch (err) {
        console.error('Error creating user:', err);
        process.exit(1);
    }
}

createTestUser();
