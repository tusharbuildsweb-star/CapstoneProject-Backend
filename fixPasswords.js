/**
 * fixPasswords.js — Run with: node fixPasswords.js
 * Resets ALL user passwords to "Password@123" and lists all accounts.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const users = await User.find({}).select('name email role');
    console.log(`Found ${users.length} user(s):\n`);
    users.forEach(u => console.log(`  [${u.role.toUpperCase()}] ${u.email}  (${u.name})`));

    // Reset all passwords to "Password@123"
    const newPassword = 'Password@123';
    const hashed = await bcrypt.hash(newPassword, 10);

    await User.updateMany({}, { $set: { password: hashed, mustChangePassword: false, isSuspended: false } });
    console.log(`\n✅ ALL ${users.length} passwords reset to: ${newPassword}`);
    console.log('\nYou can now log in with any of the above emails using: Password@123');

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
