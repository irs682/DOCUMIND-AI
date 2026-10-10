const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'org_admin', 'manager', 'researcher', 'user', 'student', 'viewer'],
      default: 'user',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'deactivated', 'pending_verification'],
      default: 'active',
    },
    avatar: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    preferences: {
      theme: { type: String, default: 'system' },
      defaultModel: { type: String, default: 'auto' },
      memoryEnabled: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Password hash middleware
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;
