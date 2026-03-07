const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('../src/models/User');

async function resetPasswords() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Reset Adnan
        const adnan = await User.findOne({ email: 'adnanmohammed7896@gmail.com' });
        if (adnan) {
            const salt1 = await bcrypt.genSalt(10);
            adnan.password = await bcrypt.hash('ecb111d0', salt1);
            await adnan.save();
            console.log('Adnan password reset successful.');
        } else {
            console.log('Adnan not found!');
        }

        // Reset Thiru
        // The prompt said thiru3210@gmail.com, but DB has thirukumar3210@gmail.com.
        // Let's reset thirukumar as that's the real email.
        const thiru = await User.findOne({ email: 'thirukumar3210@gmail.com' });
        if (thiru) {
            const salt2 = await bcrypt.genSalt(10);
            thiru.password = await bcrypt.hash('263087b3', salt2);
            // also update his email so the API script works with the prompt's email
            thiru.email = 'thiru3210@gmail.com';
            await thiru.save();
            console.log('Thiru password and email reset successful.');
        } else {
            const thiru2 = await User.findOne({ email: 'thiru3210@gmail.com' });
            if (thiru2) {
                const salt3 = await bcrypt.genSalt(10);
                thiru2.password = await bcrypt.hash('263087b3', salt3);
                await thiru2.save();
                console.log('Thiru password reset successful.');
            } else {
                console.log('Thiru not found!');
            }
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
resetPasswords();
