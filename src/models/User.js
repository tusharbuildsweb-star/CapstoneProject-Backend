const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,   // ← Always stored as lowercase — permanent fix
    trim: true         // ← Strips leading/trailing whitespace on save
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'owner', 'admin'],
    default: 'user'
  },
  mobileNumber: {
    type: String,
    default: ''
  },
  profileImage: {
    type: String,
    default: ''
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  }],
  otp: {
    type: String,
    default: null
  },
  otpExpiresAt: {
    type: Date,
    default: null
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  penaltyBalance: {
    type: Number,
    default: 0
  },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ role: 1 });
// Email index is already created by unique: true

module.exports = mongoose.model('User', userSchema);
