const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// Single source of truth for token generation
const generateToken = (id, role) => {
    return jwt.sign(
        { id, role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

class AuthService {

    async registerUser(userData) {
        const { name, email, password } = userData;

        if (!name || !email || !password) {
            throw new Error('All fields are required');
        }

        // Strict Password Rules: min 8 chars, 1 uppercase, 1 special char
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
        if (!passwordRegex.test(password)) {
            throw new Error('Password must be at least 8 characters long, contain at least one uppercase letter, and one special character.');
        }

        // Always normalize email
        const normalizedEmail = email.toLowerCase().trim();

        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            throw new Error('Email already registered');
        }

        // Pass plain password — pre-save hook in User.js handles hashing
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password,           // ← plain text; User.js pre-save bcrypts it
            role: 'user'        // Always 'user'. Owner role requires admin approval.
        });

        if (user) {
            return {
                token: generateToken(user._id, user.role),
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            };
        } else {
            throw new Error('Failed to create user account');
        }
    }

    async loginUser(email, password) {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        // Always normalize email before querying
        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Use the model method — never compare manually here
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            throw new Error('Invalid email or password');
        }

        // Reject suspended accounts
        if (user.isSuspended) {
            throw new Error('Your account has been suspended. Please contact support.');
        }

        // Update lastLogin timestamp without triggering pre-save hook
        await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

        return {
            token: generateToken(user._id, user.role),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                mustChangePassword: user.mustChangePassword
            }
        };
    }

    async getUserProfile(userId) {
        const user = await User.findById(userId).select('-password');
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    async changePassword(userId, currentPassword, newPassword) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            throw new Error('Incorrect current password');
        }

        // Strict Password Rules
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
        if (!passwordRegex.test(newPassword)) {
            throw new Error('New password must be at least 8 characters long, contain at least one uppercase letter, and one special character.');
        }

        // Assign plain text — pre-save hook will hash it
        user.password = newPassword;
        user.mustChangePassword = false;
        await user.save();

        return { success: true, message: 'Password updated successfully' };
    }

    async forceResetPassword(email) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            throw new Error('User not found');
        }
        // Assign plain text — pre-save hook hashes it
        user.password = 'Password@123';
        user.mustChangePassword = true;
        user.isSuspended = false;
        await user.save();
        return { success: true, message: 'Password reset to Password@123' };
    }

    async sendOTP(email) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            throw new Error('There is no user with that email address');
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        user.otp = otp;
        user.otpExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
        await user.save({ validateBeforeSave: false });

        const emailHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                <div style="background: #000000; padding: 40px 20px; text-align: center;">
                    <h1 style="color: #f59e0b; margin: 0; font-size: 28px; font-weight: 800;">RESERVE</h1>
                </div>
                <div style="padding: 40px; background-color: #ffffff;">
                    <p style="font-size: 16px; color: #1e293b;">Hello ${user.name},</p>
                    <p style="font-size: 16px; color: #475569;">Your login OTP is:</p>
                    <div style="background: #f8fafc; border-radius: 12px; padding: 32px; text-align: center; margin: 24px 0; border: 1px solid #e2e8f0;">
                        <span style="font-size: 36px; font-weight: 800; color: #f59e0b; letter-spacing: 0.25em;">${otp}</span>
                    </div>
                    <p style="font-size: 14px; color: #94a3b8; text-align: center;">This OTP will expire in 5 minutes.</p>
                    <p style="font-size: 13px; color: #94a3b8; margin-top: 40px; text-align: center;">If you cannot find this email, please check your Spam folder.</p>
                </div>
                <div style="background-color: #0f172a; color: #94a3b8; text-align: center; padding: 20px; font-size: 12px;">
                    &copy; ${new Date().getFullYear()} RESERVE Platform.
                </div>
            </div>
        `;

        await sendEmail({
            to: user.email,
            subject: 'Your Login OTP – RESERVE',
            html: emailHtml
        });

        return { success: true, message: 'OTP sent successfully. Please check your Inbox or Spam folder.' };
    }

    async loginWithOTP(email, otp) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({
            email: normalizedEmail,
            otp,
            otpExpiresAt: { $gt: Date.now() }
        });

        if (!user) {
            throw new Error('Invalid or expired OTP');
        }

        // Clear OTP
        user.otp = null;
        user.otpExpiresAt = null;
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        return {
            token: generateToken(user._id, user.role),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        };
    }

    async forgotPassword(email) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            throw new Error('There is no user with that email address');
        }

        // Get reset token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash token and set to resetPasswordToken field
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Set expire to 15 minutes
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

        await user.save({ validateBeforeSave: false });

        // Create reset url
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

        const emailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="background: #000000; padding: 40px 20px; text-align: center;">
                    <h1 style="color: #f59e0b; margin: 0; font-size: 28px; letter-spacing: -0.025em; font-weight: 800;">RESERVE</h1>
                    <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">Secure Password Reset</p>
                </div>
                <div style="padding: 40px; background-color: #ffffff;">
                    <p style="font-size: 16px; color: #1e293b; line-height: 1.6;">Hello,</p>
                    <p style="font-size: 16px; color: #475569; line-height: 1.6;">We received a request to reset your password. To proceed, please click the button below. This link will expire in <strong>15 minutes</strong>.</p>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${resetUrl}" style="background-color: #f59e0b; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; display: inline-block; transition: all 0.2s; box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.3);">Reset My Password</a>
                    </div>
                    
                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px dashed #cbd5e1;">
                        <p style="font-size: 13px; color: #64748b; margin: 0; word-break: break-all;">
                            <strong>Link not working?</strong> Copy and paste this URL into your browser:<br>
                            <span style="color: #f59e0b;">${resetUrl}</span>
                        </p>
                    </div>
                    
                    <p style="font-size: 14px; color: #94a3b8; margin-top: 40px; text-align: center;">
                        If you did not request this, you can safely ignore this email. Your password will remain unchanged.
                    </p>
                </div>
                <div style="background-color: #0f172a; color: #94a3b8; text-align: center; padding: 24px; font-size: 12px;">
                    &copy; ${new Date().getFullYear()} RESERVE Platform. All rights reserved.<br>
                    <span style="color: #475569;">Premium Restaurant Reservations</span>
                </div>
            </div>
        `;

        try {
            await sendEmail({
                to: user.email,
                subject: 'Reset Your Password – RESERVE',
                html: emailHtml
            });

            return { success: true, message: 'Reset email sent successfully' };
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
            throw new Error('Email could not be sent');
        }
    }

    async resetPassword(resetToken, newPassword) {
        // Get hashed token
        const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            throw new Error('Invalid token or token expired');
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        const successEmailHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                <div style="background: #000000; padding: 40px 20px; text-align: center;">
                    <h1 style="color: #f59e0b; margin: 0; font-size: 28px; font-weight: 800;">RESERVE</h1>
                </div>
                <div style="padding: 40px; background-color: #ffffff;">
                    <p style="font-size: 16px; color: #1e293b;">Hello ${user.name},</p>
                    <p style="font-size: 16px; color: #475569;">Your password has been successfully updated.</p>
                    <p style="font-size: 15px; color: #64748b; margin-top: 24px;">If you did not perform this action, please contact support immediately.</p>
                    <p style="font-size: 15px; color: #64748b; margin-top: 24px;">Thank you for using RESERVE.</p>
                </div>
                <div style="background-color: #f8fafc; color: #94a3b8; text-align: center; padding: 20px; font-size: 12px; border-top: 1px solid #e2e8f0;">
                    &copy; ${new Date().getFullYear()} RESERVE. Premium Restaurant Reservations.
                </div>
            </div>
        `;

        await sendEmail({
            to: user.email,
            subject: 'Your Password Has Been Reset – RESERVE',
            html: successEmailHtml
        }).catch(err => console.error("Failed to send reset success email:", err));

        return { success: true, message: 'Password reset successfully' };
    }
}

module.exports = new AuthService();
