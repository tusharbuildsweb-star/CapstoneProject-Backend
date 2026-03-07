const authService = require('../services/authService');

const register = async (req, res, next) => {
  try {
    const data = await authService.registerUser(req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Registration failed' });
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const data = await authService.loginUser(email, password);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Login failed' });
  }
};

const sendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.sendOTP(email);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to send OTP' });
  }
};

const loginWithOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const data = await authService.loginWithOTP(email, otp);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'OTP Login failed' });
  }
};

const getMe = async (req, res, next) => {
  try {
    // req.user is the full DB document set by protect middleware
    // Use _id (Mongoose doc) or id (plain object) — handle both
    const userId = req.user._id || req.user.id;
    const user = await authService.getUserProfile(userId);
    res.status(200).json(user);
  } catch (error) {
    res.status(404).json({ message: error.message || 'User not found' });
  }
};

const logout = async (req, res, next) => {
  // JWT is stateless — logout is handled client-side by clearing the token.
  res.status(200).json({ message: 'Logged out successfully' });
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id || req.user.id;
    const result = await authService.changePassword(userId, currentPassword, newPassword);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Password change failed' });
  }
};

const forceResetPassword = async (req, res, next) => {
  try {
    const { email } = req.params;
    const result = await authService.forceResetPassword(email);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Reset failed' });
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Forgot password failed' });
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { resetToken } = req.params;
    const { password } = req.body;
    const result = await authService.resetPassword(resetToken, password);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Reset password failed' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  changePassword,
  forceResetPassword,
  forgotPassword,
  resetPassword,
  sendOTP,
  loginWithOTP
};
