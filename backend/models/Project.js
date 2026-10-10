const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 240,
    },
    instructions: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    color: {
      type: String,
      default: '#4f46e5',
    },
    icon: {
      type: String,
      default: 'folder',
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    documentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

projectSchema.index({ owner: 1, status: 1, isPinned: -1, lastActivityAt: -1 });
projectSchema.index({ owner: 1, updatedAt: -1 });

module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);

