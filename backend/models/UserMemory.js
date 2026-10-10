const mongoose = require('mongoose');

const userMemorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['preference', 'profile', 'project', 'goal', 'constraint', 'decision'],
      required: true,
      default: 'preference',
    },
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    confidence: {
      type: Number,
      default: 0.95,
      min: 0.0,
      max: 1.0,
    },
    sourceConversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatSession',
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'forgotten'],
      default: 'active',
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

userMemorySchema.index({ userId: 1, status: 1, key: 1 });
userMemorySchema.index({ userId: 1, updatedAt: -1 });

const UserMemory = mongoose.models.UserMemory || mongoose.model('UserMemory', userMemorySchema);
module.exports = UserMemory;
