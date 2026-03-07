const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Restaurant = require('../models/Restaurant');
const TimeSlot = require('../models/TimeSlot');
const User = require('../models/User');
const { logActivity } = require('../utils/activityLogger');
const Waitlist = require('../models/Waitlist');
const { getTableType } = require('../controllers/timeSlotController');
const sendEmail = require('../utils/sendEmail');
const NotificationService = require('./notificationService');

class ReservationService {
    async createReservation(userId, data) {
        const restaurant = await Restaurant.findById(data.restaurantId);
        if (!restaurant) throw new Error('Restaurant not found');

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        // Rule 5: User can only have one active reservation at a time.
        // Active means: 'Confirmed' (with 3-hour grace period) OR ('Pending' AND not expired)
        const now = new Date();
        const activeCriteria = {
            userId: userId,
            $or: [
                { status: 'confirmed', bookingDateTime: { $gt: new Date(now.getTime() - 3 * 60 * 60 * 1000) } },
                { status: 'payment_initiated', lockExpiresAt: { $gt: now } }
            ]
        };

        const activeReservation = await Reservation.findOne(activeCriteria);

        if (activeReservation) {
            throw new Error('You already have an active reservation. Complete or cancel it before booking another restaurant.');
        }

        let slot = null;
        let tableType = null;

        if (data.slotId) {
            slot = await TimeSlot.findById(data.slotId);
            if (!slot) throw new Error('Time slot not found');
            if (!slot.isActive) throw new Error('This time slot is no longer active');

            tableType = getTableType(data.guests);
            const cap = slot.capacity[tableType] || 0;
            const bkd = slot.booked[tableType] || 0;

            if (cap === 0) {
                throw new Error(`No ${tableType.replace(/([A-Z])/g, ' $1').toLowerCase()} tables configured for this slot.`);
            }
            if (bkd >= cap) {
                throw new Error('This table type is fully booked for the selected slot. Please choose another time or party size.');
            }
        }

        const lockExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min lock

        // Parse "YYYY-MM-DD" and time (e.g. "11:30 AM" or "14:00")
        let bookingDateTime = new Date(data.date);
        if (data.time) {
            const timeMatch = data.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1], 10);
                const mins = parseInt(timeMatch[2], 10);
                const modifier = timeMatch[3];
                if (modifier && modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
                if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
                bookingDateTime.setHours(hours, mins, 0, 0);
            }
        }

        // Apply any outstanding penalties
        let finalPenalty = 0;
        if (user.penaltyBalance > 0) {
            finalPenalty = user.penaltyBalance;
            user.penaltyBalance = 0; // Reset after adding to booking
            await user.save();

            if (global.io) {
                global.io.emit('globalUpdate', { type: 'reservationStatusChanged' });
            }
        }

        // --- BACKEND-ONLY BILLING CALCULATION ---
        const tableCount = Math.ceil((Number(data.guests) || 1) / 4);
        const advancePaid = tableCount * 200;
        const platformFee = 100; // Fixed ₹100 platform fee

        let packageCost = 0;
        if (data.selectedPackage?.packageId) {
            const pkg = await Package.findById(data.selectedPackage.packageId);
            if (pkg) {
                packageCost = pkg.price || 0;
                // Update denormalized package info to match DB
                data.selectedPackage.title = pkg.title;
                data.selectedPackage.totalCost = pkg.price;
            }
        }

        let preorderTotal = 0;
        if (Array.isArray(data.preorderItems)) {
            preorderTotal = data.preorderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        }

        const totalPaidNow = advancePaid + packageCost + preorderTotal + platformFee + finalPenalty;
        // ------------------------------------------

        const reservation = new Reservation({
            ...data,
            userId,
            ownerId: restaurant.ownerId,
            lockExpiresAt,
            status: 'payment_initiated',
            bookingDateTime,
            advancePaid,
            platformFee,
            preorderTotal,
            totalPaidNow
        });

        // Denormalise user info for easy display in owner/admin dashboards
        reservation.userName = user.name || '';
        reservation.userEmail = user.email || '';

        const savedReservation = await reservation.save();

        // Atomically increment the correct table type booked count
        if (slot && tableType) {
            await TimeSlot.findByIdAndUpdate(slot._id, {
                $inc: { [`booked.${tableType}`]: 1 }
            });
        }

        if (global.io) {
            global.io.emit('globalUpdate', {
                type: 'reservation_created',
                userId,
                restaurantId: data.restaurantId
            });
        }

        await logActivity(userId, 'reservation_created', {
            restaurantId: data.restaurantId,
            reservationId: savedReservation._id,
            penaltyAdded: finalPenalty,
            amount: totalPaidNow
        });

        // Trigger Notification
        const notificationTitle = 'Reservation Initiated';
        const notificationMessage = data.selectedPackage
            ? `Your booking for "${data.selectedPackage.title}" at ${restaurant.name} is pending payment.`
            : `Your reservation at ${restaurant.name} is pending payment.`;

        await NotificationService.createNotification(
            userId,
            notificationTitle,
            notificationMessage,
            'reservation',
            'user',
            `/dashboard/user`
        );

        // Also notify Owner
        await NotificationService.createNotification(
            restaurant.ownerId,
            'New Reservation Request',
            `A new reservation request has been received for ${restaurant.name}.`,
            'reservation',
            'owner',
            `/dashboard/owner`
        );

        return savedReservation;
    }

    async getUserReservations(userId) {
        const now = new Date();
        const gracePeriod = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3-hour grace period

        const reservations = await Reservation.find({ userId })
            .populate('restaurantId')
            .populate('userId', 'name profileImage')
            .sort({ bookingDateTime: -1 });

        return {
            upcoming: reservations.filter(r =>
                (r.status === 'confirmed' && new Date(r.bookingDateTime) >= gracePeriod)
            ),
            history: reservations.filter(r =>
                r.status === 'cancelled' ||
                r.status === 'completed' ||
                r.status === 'payment_failed' ||
                (r.status === 'confirmed' && new Date(r.bookingDateTime) < gracePeriod) ||
                (r.status === 'payment_initiated' && (new Date(r.lockExpiresAt) <= now || !r.lockExpiresAt))
            )
        };
    }

    async getOwnerReservations(ownerId) {
        return await Reservation.find({ ownerId })
            .populate('restaurantId')
            .populate('userId', 'name profileImage')
            .sort({ bookingDateTime: -1 });
    }

    async checkDuplicateBooking(userId, restaurantId) {
        const booking = await Reservation.findOne({
            userId,
            restaurantId,
            status: { $in: ['payment_initiated', 'confirmed'] },
            $or: [
                { status: 'confirmed' },
                { status: 'payment_initiated', lockExpiresAt: { $gt: new Date() } }
            ]
        }).sort({ createdAt: -1 });

        if (!booking) return { hasBooking: false };

        const restaurant = await Restaurant.findById(restaurantId);
        return {
            hasBooking: true,
            booking: {
                bookingId: booking._id,
                restaurantName: restaurant?.name || 'Restaurant',
                date: booking.date,
                time: booking.time,
                guests: booking.guests,
                totalAmount: booking.totalPaidNow
            }
        };
    }

    async cancelReservation(id, userId) {
        const reservation = await Reservation.findById(id).populate('restaurantId');
        if (!reservation) throw new Error('Reservation not found');
        if (reservation.userId.toString() !== userId.toString()) {
            throw new Error('Not authorized to cancel this reservation');
        }

        if (reservation.status === 'cancelled') return reservation;
        if (reservation.status === 'completed') throw new Error('Cannot cancel a completed reservation');

        const now = new Date();
        const bookingTime = new Date(reservation.bookingDateTime);
        const hoursUntilBooking = (bookingTime - now) / (1000 * 60 * 60);

        let refundAmount = 0;
        let penalty = 0;
        let policyNote = '';

        if (reservation.selectedPackage?.packageId) {
            // Special rule for packages: 12-hour cutoff
            if (hoursUntilBooking >= 12) {
                refundAmount = reservation.advancePaid;
                policyNote = 'Full refund of advance (Package rule: >12h).';
            } else {
                refundAmount = 0;
                policyNote = 'No refund for package cancellations within 12 hours.';
            }
        } else if (hoursUntilBooking >= 5) {
            // Cancel before 5 hours -> full refund of advance
            refundAmount = reservation.advancePaid;
            policyNote = 'Full refund of advance paid.';
        } else if (hoursUntilBooking >= 2) {
            // Cancel between 2–5 hours -> partial refund with small deduction (e.g. 20% deduction)
            refundAmount = Math.max(0, reservation.advancePaid * 0.8);
            policyNote = 'Partial refund (80%) due to late cancellation (2-5h).';
        } else {
            // Cancel within 2 hours -> no refund + penalty
            refundAmount = 0;
            penalty = 100; // Standard penalty of ₹100
            policyNote = 'No refund and ₹100 penalty applied for cancellation within 2 hours.';

            // Store penalty in user account
            await User.findByIdAndUpdate(userId, { $inc: { penaltyBalance: penalty } });
        }

        reservation.status = 'cancelled';
        reservation.paymentStatus = refundAmount > 0 ? 'Refunded' : reservation.paymentStatus;
        await reservation.save();

        // Trigger Notification
        await NotificationService.createNotification(
            userId,
            'Reservation Cancelled',
            `Your reservation at ${reservation.restaurantId?.name || 'the restaurant'} has been cancelled successfully.`,
            'reservation',
            'user',
            `/dashboard/user`
        );

        // Notify Owner too
        await NotificationService.createNotification(
            reservation.restaurantId.ownerId,
            'Reservation Cancelled by User',
            `Reservation #${reservation._id.toString().slice(-6).toUpperCase()} at ${reservation.restaurantId.name} was cancelled.`,
            'reservation',
            'owner',
            `/dashboard/owner`
        );

        // Free up the correct table type
        if (reservation.slotId) {
            const tableType = getTableType(reservation.guests);
            await TimeSlot.findByIdAndUpdate(reservation.slotId, {
                $inc: { [`booked.${tableType}`]: -1 }
            });
            if (global.io) {
                global.io.emit('slotUpdated', { restaurantId: reservation.restaurantId });
            }
        }

        // Send Cancellation Email with policy details
        const emailHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #ef4444; padding: 30px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 24px;">Reservation Cancelled</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Booking #${reservation._id.toString().slice(-6).toUpperCase()}</p>
                </div>
                <div style="padding: 40px; background-color: white;">
                    <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Hello ${reservation.userName},</p>
                    <p style="font-size: 16px; color: #475569;">Your reservation at <strong>${reservation.restaurantId?.name || 'the restaurant'}</strong> has been cancelled.</p>
                    
                    <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #ef4444;">
                        <h3 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Cancellation Policy Applied</h3>
                        <p style="margin: 0; font-size: 15px; color: #1e293b; font-weight: 600;">${policyNote}</p>
                        ${penalty > 0 ? `<p style="margin: 10px 0 0 0; font-size: 13px; color: #ef4444;">* A penalty of ₹${penalty} has been added to your account and will be applied to your next booking.</p>` : ''}
                    </div>

                    <p style="font-size: 16px; color: #475569; margin-bottom: 5px;"><strong>Original Details:</strong></p>
                    <ul style="font-size: 15px; color: #475569; list-style: none; padding: 0;">
                        <li style="margin-bottom: 8px;">📅 ${new Date(reservation.date).toDateString()}</li>
                        <li style="margin-bottom: 8px;">⏰ ${reservation.time}</li>
                        <li style="margin-bottom: 8px;">👥 ${reservation.guests} Guests</li>
                    </ul>
                </div>
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    RESERVE Premium Dining Platform
                </div>
            </div>
        `;

        if (reservation.userEmail) {
            await sendEmail({
                to: reservation.userEmail,
                subject: `Cancellation Confirmation - ₹${penalty} Penalty Applied`,
                html: emailHtml
            }).catch(err => console.error("Failed to send cancellation email:", err));
        }

        // Waitlist logic (unchanged but ensured it runs)
        this.processWaitlist(reservation);

        if (global.io) {
            global.io.emit('globalUpdate', {
                type: 'reservationStatusChanged',
                reservationId: reservation._id
            });
        }

        return reservation;
    }

    async processWaitlist(reservation) {
        try {
            const resDate = new Date(reservation.date);
            const startOfDay = new Date(resDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(resDate.setHours(23, 59, 59, 999));

            const nextInLine = await Waitlist.findOne({
                restaurantId: reservation.restaurantId,
                date: { $gte: startOfDay, $lte: endOfDay },
                status: 'Waiting'
            }).sort({ createdAt: 1 }).populate('userId', 'name email');

            if (nextInLine && nextInLine.userId && nextInLine.userId.email) {
                nextInLine.status = 'Notified';
                await nextInLine.save();

                const waitlistHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
                        <div style="background-color: #10b981; padding: 20px; text-align: center; color: white;">
                            <h1 style="margin: 0;">Table Available!</h1>
                        </div>
                        <div style="padding: 30px;">
                            <p>Hello ${nextInLine.userId.name},</p>
                            <p>A table has opened up on <strong>${new Date(nextInLine.date).toDateString()}</strong>. Book now!</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/restaurants/${reservation.restaurantId}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Book Now</a>
                            </div>
                        </div>
                    </div>
                `;

                await sendEmail({
                    to: nextInLine.userId.email,
                    subject: 'A Table is Now Available!',
                    html: waitlistHtml
                }).catch(err => console.error("Failed to send waitlist email:", err));
            }
        } catch (waitlistErr) {
            console.error("Error processing waitlist notification:", waitlistErr);
        }
    }

    async autoCompleteReservations() {
        try {
            const now = new Date();
            // 1. Mark confirmed bookings as Completed if the time has passed (e.g. 3 hours after start)
            const cutoffTime = new Date(Date.now() - 3 * 60 * 60 * 1000);
            const completedResults = await Reservation.updateMany(
                {
                    status: 'confirmed',
                    bookingDateTime: { $lt: cutoffTime }
                },
                { status: 'completed' }
            );

            // 2. Handle expired pending reservations (need to restore capacity)
            const expiredReservations = await Reservation.find({
                status: 'payment_initiated',
                lockExpiresAt: { $lt: now }
            });

            for (const res of expiredReservations) {
                res.status = 'payment_failed';
                await res.save();

                // Restore capacity
                if (res.slotId) {
                    const tableType = getTableType(res.guests);
                    await TimeSlot.findByIdAndUpdate(res.slotId, {
                        $inc: { [`booked.${tableType}`]: -1 }
                    });
                    if (global.io) {
                        global.io.emit('slotUpdated', { restaurantId: res.restaurantId });
                    }
                }
            }

            if (completedResults.modifiedCount > 0 && global.io) {
                global.io.emit('globalUpdate', { type: 'reservationCompleted' });
            }
            if (expiredReservations.length > 0 && global.io) {
                global.io.emit('globalUpdate', { type: 'reservationPaymentFailed' });
            }
        } catch (error) {
            console.error('Error in autoCompleteReservations:', error);
        }
    }

    async updateReservationStatus(id, ownerId, status) {
        const reservation = await Reservation.findById(id).populate('restaurantId');
        if (!reservation) throw new Error('Reservation not found');
        if (reservation.restaurantId.ownerId.toString() !== ownerId.toString()) {
            throw new Error('Not authorized to update this reservation');
        }

        const oldStatus = reservation.status;
        reservation.status = status;
        const updatedReservation = await reservation.save();

        const tableType = getTableType(reservation.guests);
        let slotUpdated = false;

        if (status === 'cancelled' && oldStatus !== 'cancelled' && reservation.slotId) {
            await TimeSlot.findByIdAndUpdate(reservation.slotId, {
                $inc: { [`booked.${tableType}`]: -1 }
            });
            slotUpdated = true;
        } else if (status !== 'cancelled' && oldStatus === 'cancelled' && reservation.slotId) {
            await TimeSlot.findByIdAndUpdate(reservation.slotId, {
                $inc: { [`booked.${tableType}`]: 1 }
            });
            slotUpdated = true;
        }

        if (global.io) {
            if (slotUpdated) {
                global.io.emit('slotUpdated', { restaurantId: reservation.restaurantId._id });
            }
            global.io.emit('globalUpdate', {
                type: 'reservationStatusChanged',
                reservationId: updatedReservation._id
            });
        }

        return updatedReservation;
    }

    async joinWaitlist(userId, data) {
        // Find user to ensure they exist
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const restaurant = await Restaurant.findById(data.restaurantId);
        if (!restaurant) throw new Error('Restaurant not found');

        // Check if already on waitlist for this date/time/restaurant
        const existing = await Waitlist.findOne({
            userId,
            restaurantId: data.restaurantId,
            date: new Date(data.date),
            status: 'Waiting'
        });

        if (existing) {
            throw new Error('You are already on the waitlist for this date');
        }

        const waitlistEntry = new Waitlist({
            userId,
            restaurantId: data.restaurantId,
            date: new Date(data.date),
            time: data.time || 'Any',
            guests: data.guests
        });

        await waitlistEntry.save();
        return waitlistEntry;
    }


    async processWaitlist(cancelledReservation) {
        // Logic to notify waitlist users when a slot opens up
        // Simplified for this task: notify everyone on waitlist for this restaurant and date
        const Waitlist = require('../models/Waitlist');
        const notificationService = require('./notificationService');

        const waitingUsers = await Waitlist.find({
            restaurantId: cancelledReservation.restaurantId,
            date: cancelledReservation.date,
            status: 'Waiting'
        });

        for (const user of waitingUsers) {
            await NotificationService.createNotification(
                user.userId,
                'Table Available!',
                `A table has opened up at ${cancelledReservation.restaurantId?.name || 'the restaurant'} for ${cancelledReservation.date}!`,
                'reservation',
                'user',
                `/restaurants/${cancelledReservation.restaurantId?._id || cancelledReservation.restaurantId}`
            );
        }
    }
}

module.exports = new ReservationService();
