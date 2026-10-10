const mongoose = require('mongoose');

const agentTaskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    agentType: {
      type: String,
      default: 'agent-research',
    },
    prompt: {
      type: String,
      required: true,
    },
    knowledgeBaseId: {
      type: String,
      default: 'all',
    },
    depth: {
      type: String,
      default: 'deep',
    },
    status: {
      type: String,
      enum: ['queued', 'executing', 'completed', 'failed'],
      default: 'queued',
    },
    stepLogs: [
      {
        title: String,
        detail: String,
        completedAt: Date,
      },
    ],
    outputSummary: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

agentTaskSchema.index({ user: 1, createdAt: -1 });

const AgentTask = mongoose.models.AgentTask || mongoose.model('AgentTask', agentTaskSchema);
module.exports = AgentTask;
