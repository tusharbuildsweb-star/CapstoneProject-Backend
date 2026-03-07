const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Reservation = require('../models/Reservation');
const TimeSlot = require('../models/TimeSlot');
const { getTableType } = require('../controllers/timeSlotController');
const sendEmail = require('../utils/sendEmail');

class PaymentService {
    async createOrder(reservationId, amount) {
        // Verify reservation exists
        const reservation = await Reservation.findById(reservationId);
        if (!reservation) throw new Error('Reservation not found');

        // Always calculate total in backend
        const advance = 200;
        const preorderTotal = (reservation.preorderItems || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const packagePrice = reservation.selectedPackage?.totalCost || 0;
        const platformFee = 100; // Flat ₹100 platform fee

        const total = advance + preorderTotal + packagePrice + platformFee;

        reservation.advancePaid = advance;
        reservation.preorderTotal = preorderTotal;
        reservation.platformFee = platformFee;
        reservation.totalPaidNow = total;
        await reservation.save();

        const options = {
            amount: Math.round(total * 100), // amount in smallest currency unit (paise)
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        const payment = new Payment({
            reservationId,
            razorpayOrderId: order.id,
            amount,
            paymentStatus: 'Created'
        });

        await payment.save();

        return order;
    }

    async verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
        const body = razorpayOrderId + '|' + razorpayPaymentId;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpaySignature;

        if (isAuthentic) {
            const payment = await Payment.findOne({ razorpayOrderId });
            if (!payment) throw new Error('Payment record not found');

            payment.razorpayPaymentId = razorpayPaymentId;
            payment.razorpaySignature = razorpaySignature;
            payment.paymentStatus = 'Captured';
            await payment.save();

            const reservation = await Reservation.findById(payment.reservationId).populate('restaurantId');
            let orderId = '';
            if (reservation) {
                reservation.paymentStatus = 'Paid';
                reservation.status = 'confirmed';
                reservation.lockExpiresAt = null;

                // Generate Order ID
                const random4 = Math.floor(1000 + Math.random() * 9000);
                orderId = `RES-${Date.now()}-${random4}`;
                reservation.razorpayOrderId = orderId; // storing as the main order reference

                await reservation.save();

                if (global.io) {
                    global.io.emit('reservationUpdated', { restaurantId: reservation.restaurantId._id });
                    global.io.emit('newReservation', {
                        restaurantId: reservation.restaurantId._id,
                        ownerId: reservation.restaurantId.ownerId
                    });
                    global.io.emit('globalUpdate', {
                        type: 'reservationPaymentSuccess',
                        reservationId: reservation._id
                    });
                }

                // Send Confirmation Email
                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
                        <div style="background-color: #f59e0b; padding: 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0;">Booking Confirmed!</h1>
                        </div>
                        <div style="padding: 30px;">
                            <p style="font-size: 16px; color: #333;">Hello ${reservation.userName},</p>
                            <p style="font-size: 16px; color: #333;">Your reservation at <strong>${reservation.restaurantId.name}</strong> has been successfully confirmed.</p>
                            <ul style="font-size: 16px; color: #333; line-height: 1.6;">
                                <li><strong>Date:</strong> ${new Date(reservation.date).toDateString()}</li>
                                <li><strong>Time:</strong> ${reservation.time}</li>
                                <li><strong>Guests:</strong> ${reservation.guests}</li>
                                <li><strong>Booking ID:</strong> ${orderId}</li>
                            </ul>
                            <p style="font-size: 16px; color: #333;">We look forward to hosting you!</p>
                        </div>
                    </div>
                `;

                if (reservation.userEmail) {
                    await sendEmail({
                        to: reservation.userEmail,
                        subject: `Booking Confirmed: ${reservation.restaurantId.name}`,
                        html: emailHtml
                    }).catch(err => console.error("Failed to send booking confirmation email:", err));
                }
            }

            return {
                success: true,
                message: 'Payment verified successfully',
                orderId,
                restaurantName: reservation?.restaurantId?.name,
                guests: reservation?.guests,
                tableSize: reservation?.tableSize,
                selectedPackage: reservation?.selectedPackage,
                preorderItems: reservation?.preorderItems
            };
        } else {
            throw new Error('Invalid signature');
        }
    }

    async handleWebhook(event) {
        // Here we could handle async events directly from Razorpay (e.g., payment.captured, payment.failed)
        return true;
    }

    async handlePaymentFailure(razorpayOrderId) {
        const payment = await Payment.findOne({ razorpayOrderId });
        if (!payment) return { success: false, message: 'Payment record not found' };

        payment.paymentStatus = 'Failed';
        await payment.save();

        const reservation = await Reservation.findById(payment.reservationId);
        if (reservation) {
            const oldStatus = reservation.status;
            reservation.status = 'payment_failed';
            await reservation.save();

            // Release capacity if it was previously initiated
            if (oldStatus === 'payment_initiated' && reservation.slotId) {
                const tableType = getTableType(reservation.guests);
                await TimeSlot.findByIdAndUpdate(reservation.slotId, {
                    $inc: { [`booked.${tableType}`]: -1 }
                });

                if (global.io) {
                    global.io.emit('slotUpdated', { restaurantId: reservation.restaurantId });
                }
            }

            if (global.io) {
                global.io.emit('globalUpdate', {
                    type: 'reservationPaymentFailed',
                    reservationId: reservation._id
                });
            }
        }

        return { success: true, message: 'Payment failure recorded' };
    }
}

module.exports = new PaymentService();
