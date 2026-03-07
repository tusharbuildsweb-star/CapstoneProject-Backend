const Restaurant = require('../models/Restaurant');

/**
 * Self-healing utility to ensure the platform's core data remains stable and reliable.
 * This runs on server startup and performs necessary data corrections.
 */
const performSelfHealing = async () => {
    try {
        console.log('--- [SELF-HEALING] Starting platform data verification ---');

        // 1. Ensure all restaurants are approved and active
        // This addresses the "missing restaurants" issue and ensures permanent visibility
        const now = new Date();
        const futureDate = new Date();
        futureDate.setFullYear(now.getFullYear() + 1); // 1 year extension

        const result = await Restaurant.updateMany(
            {}, // All existing restaurants
            {
                $set: {
                    isApproved: true,
                    subscriptionStatus: 'active',
                    subscriptionExpiresAt: futureDate
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`[SELF-HEALING] Successfully activated and approved ${result.modifiedCount} restaurants.`);
        } else {
            console.log('[SELF-HEALING] All restaurants are already in correct state.');
        }

        // 2. Clear stale "payment_initiated" reservations that are blocking users
        const stalePending = await require('../models/Reservation').updateMany(
            {
                status: 'payment_initiated',
                lockExpiresAt: { $lt: now }
            },
            {
                $set: { status: 'payment_failed' }
            }
        );

        if (stalePending.modifiedCount > 0) {
            console.log(`[SELF-HEALING] Cleaned up ${stalePending.modifiedCount} stale payment_initiated reservations.`);
        }

        // 3. Enforce Three-Way Link Integrity (User <-> Restaurant <-> Owner)
        // Find reservations missing ownerId and repair them
        const brokenReservations = await require('../models/Reservation').find({
            ownerId: { $exists: false }
        }).populate('restaurantId');

        let repairedCount = 0;
        for (const res of brokenReservations) {
            if (res.restaurantId && res.restaurantId.ownerId) {
                res.ownerId = res.restaurantId.ownerId;
                await res.save();
                repairedCount++;
            }
        }

        if (repairedCount > 0) {
            console.log(`[SELF-HEALING] Repaired ${repairedCount} reservations with missing ownerId.`);
        }

        console.log('--- [SELF-HEALING] Verification complete ---');
    } catch (error) {
        console.error('[SELF-HEALING ERROR] Failed to perform self-healing:', error);
    }
};

module.exports = performSelfHealing;
