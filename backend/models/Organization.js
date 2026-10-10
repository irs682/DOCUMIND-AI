const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['org_admin', 'manager', 'researcher', 'user', 'student', 'viewer'],
      default: 'user',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    members: [memberSchema],
    plan: {
      type: String,
      enum: ['free', 'student', 'professional', 'enterprise'],
      default: 'free',
    },
    quotas: {
      maxDocuments: { type: Number, default: 100 },
      maxStorageBytes: { type: Number, default: 262144000 }, // 250 MB
      maxAiTokensPerMonth: { type: Number, default: 500000 },
      monthlyTokensUsed: { type: Number, default: 0 },
      maxTeamMembers: { type: Number, default: 10 },
    },
    settings: {
      allowedModels: {
        type: [String],
        default: ['all-MiniLM-L6-v2', 'default-llm'],
      },
      retentionDays: { type: Number, default: 365 },
      enforceTenantIsolation: { type: Boolean, default: true },
      enableOcr: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

organizationSchema.index({ owner: 1 });

const Organization = mongoose.models.Organization || mongoose.model('Organization', organizationSchema);

module.exports = Organization;
