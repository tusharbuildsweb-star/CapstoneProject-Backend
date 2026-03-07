const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, getMe, logout, changePassword, forceResetPassword, forgotPassword, resetPassword, sendOTP, loginWithOTP } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per 'window'
    message: { message: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/send-otp', sendOTP);
router.post('/login-otp', loginWithOTP);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/change-password', protect, changePassword);
router.put('/reset-password/:email', forceResetPassword); // This is likely for admin forced reset

// New routes for public password reset
router.post('/forgot-password', forgotPassword);
router.put('/reset-password-token/:resetToken', resetPassword);

module.exports = router;
