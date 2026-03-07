/**
 * fix_old_users.js — One-time migration script
 *
 * PURPOSE:
 *   Finds any users whose password field does NOT start with a bcrypt hash
 *   prefix ($2b$ or $2a$) and re-hashes it correctly.
 *
 * WHEN TO RUN:
 *   Run ONCE after deploying the auth system fix:
 *     node fix_old_users.js
 *
 *   Safe to run multiple times — it skips already-hashed passwords.
 *   Delete this file after verifying all users can log in.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

async function fixOldUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        const users = await User.find({});
        console.log(`Found ${users.length} total users.\n`);

        let fixed = 0;
        let alreadyOk = 0;
        let errors = 0;

        for (const user of users) {
            // Check if password is already a bcrypt hash
            const isBcrypt = user.password &&
                (user.password.startsWith('$2b$') || user.password.startsWith('$2a$'));

            if (isBcrypt) {
                alreadyOk++;
                continue;
            }

            // Password is plaintext or double-encoded — re-hash it
            try {
                console.log(`⚠️  Fixing user: ${user.email} (password not bcrypt-hashed)`);

                // Use bcrypt directly here to avoid triggering pre-save logic on corrupt data
                const hashed = await bcrypt.hash(user.password, 10);
                await User.findByIdAndUpdate(user._id, { password: hashed });

                console.log(`   ✅ Fixed: ${user.email}`);
                fixed++;
            } catch (err) {
                console.error(`   ❌ Error fixing ${user.email}:`, err.message);
                errors++;
            }
        }

        console.log('\n─────────────────────────────────────────');
        console.log(`✅ Already OK  : ${alreadyOk} users`);
        console.log(`🔧 Fixed       : ${fixed} users`);
        if (errors > 0) {
            console.log(`❌ Errors      : ${errors} users (check logs above)`);
        }
        console.log('─────────────────────────────────────────');
        if (fixed === 0) {
            console.log('\n✅ All users already have correct bcrypt passwords. No action needed.');
        } else {
            console.log(`\n✅ Migration complete. ${fixed} users fixed.`);
        }

        // Also normalize emails (lowercase) for all users
        console.log('\n📧 Normalizing email addresses to lowercase...');
        let emailFixed = 0;
        for (const user of users) {
            const normalized = user.email?.toLowerCase().trim();
            if (normalized && normalized !== user.email) {
                await User.findByIdAndUpdate(user._id, { email: normalized });
                console.log(`   Normalized: ${user.email} → ${normalized}`);
                emailFixed++;
            }
        }
        if (emailFixed === 0) {
            console.log('   ✅ All emails already lowercase. No changes needed.');
        } else {
            console.log(`   ✅ Normalized ${emailFixed} email addresses.`);
        }

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

fixOldUsers();
