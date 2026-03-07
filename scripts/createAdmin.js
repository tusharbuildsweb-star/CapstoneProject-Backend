require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const adminEmail = process.argv[2];
        const adminPassword = process.argv[3];
        const adminName = process.argv[4] || 'System Admin';

        if (!adminEmail || !adminPassword) {
            console.error('Usage: npm run create-admin <email> <password> [name]');
            process.exit(1);
        }

        const existingUser = await User.findOne({ email: adminEmail });

        if (existingUser) {
            console.log('User already exists in database. Updating role to admin...');
            existingUser.role = 'admin';
            // Only update password if they want to override the existing one
            const salt = await bcrypt.genSalt(10);
            existingUser.password = await bcrypt.hash(adminPassword, salt);
            await existingUser.save();
            console.log('Admin user updated successfully.');
        } else {
            console.log('Creating new admin user...');

            // Password hashing is handled automatically by the pre-save hook in User.js
            const newAdmin = new User({
                name: adminName,
                email: adminEmail,
                password: adminPassword,
                role: 'admin'
            });

            await newAdmin.save();
            console.log('Admin user created successfully.');
        }

        mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
