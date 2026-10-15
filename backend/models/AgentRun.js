const mongoose = require('mongoose');

const agentTaskItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    dependencies: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped', 'waiting_for_user'],
      default: 'pending',
    },
    input: { type: mongoose.Schema.Types.Mixed, default: {} },
    output: { type: mongoose.Schema.Types.Mixed, default: null },
    retries: { type: Number, default: 0 },
    evidenceIds: { type: [String], default: [] },
    error: { type: String, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const evidenceReferenceSchema = new mongoose.Schema(
  {
    evidenceId: { type: String, required: true },
    documentId: { type: String, default: '' },
    documentTitle: { type: String, default: '' },
    pageNumber: { type: Number, default: 1 },
    objectType: {
      type: String,
      enum: ['text', 'heading', 'table', 'figure', 'chart', 'diagram', 'equation', 'ocr'],
      default: 'text',
    },
    objectId: { type: String, default: null },
    content: { type: String, default: '' },
    caption: { type: String, default: null },
    citation: { type: String, default: '' },
    confidence: { type: Number, default: 1.0 },
    sourceMethod: { type: String, default: 'native_text' },
  },
  { _id: false }
);

const claimRecordSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true },
    text: { type: String, required: true },
    type: { type: String, default: 'factual' },
    evidenceIds: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['VERIFIED', 'PARTIALLY_SUPPORTED', 'UNSUPPORTED', 'NEEDS_VERIFICATION'],
      default: 'NEEDS_VERIFICATION',
    },
    confidence: { type: Number, default: 0.8 },
  },
  { _id: false }
);

const agentArtifactSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'comparison_matrix',
        'literature_synthesis',
        'research_gaps',
        'research_questions',
        'methodology_proposal',
        'benchmark_evaluation',
        'empirical_results',
        'manuscript_draft',
        'audit_report',
        'custom_brief',
      ],
      required: true,
    },
    version: { type: Number, default: 1 },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const toolCallRecordSchema = new mongoose.Schema(
  {
    callId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    agent: { type: String, required: true },
    tool: { type: String, required: true },
    input: { type: mongoose.Schema.Types.Mixed, default: {} },
    outputSummary: { type: String, default: '' },
    durationMs: { type: Number, default: 0 },
    status: { type: String, enum: ['success', 'fallback', 'failed', 'timeout'], default: 'success' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const approvalRequestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['accept_gap', 'accept_methodology', 'accept_equation', 'replace_results', 'commit_manuscript'],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    proposedPayload: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'approved', 'edited', 'rejected'],
      default: 'pending',
    },
    userFeedback: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },
  },
  { _id: false }
);

const checkpointSchema = new mongoose.Schema(
  {
    checkpointId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    phase: { type: String, required: true },
    completedTaskCount: { type: Number, default: 0 },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const agentRunSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResearchProject',
      default: null,
      index: true,
    },
    conversationId: {
      type: String,
      default: null,
      index: true,
    },
    documentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],
    knowledgeBaseId: {
      type: String,
      default: null,
    },

    // Goal & Scope
    userGoal: {
      type: String,
      required: true,
      trim: true,
    },
    taskType: {
      type: String,
      default: 'AUTONOMOUS_RESEARCH',
      index: true,
    },
    depth: {
      type: String,
      enum: ['quick', 'standard', 'deep_research'],
      default: 'standard',
    },

    // Execution State
    status: {
      type: String,
      enum: [
        'queued',
        'planning',
        'running',
        'waiting_for_user',
        'waiting_for_retry',
        'stalled',
        'verifying',
        'completed',
        'failed',
        'cancelled',
        'paused',
      ],
      default: 'queued',
      index: true,
    },
    currentPhase: {
      type: String,
      default: 'queued',
    },
    currentNode: {
      type: String,
      default: 'START',
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    planSource: {
      type: String,
      enum: ['llm_generated', 'preset_fallback', 'custom'],
      default: 'llm_generated',
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },

    // Task Graph Plan
    plan: {
      tasks: { type: [agentTaskItemSchema], default: [] },
    },
    completedTasks: { type: [agentTaskItemSchema], default: [] },
    pendingTasks: { type: [agentTaskItemSchema], default: [] },
    failedTasks: { type: [agentTaskItemSchema], default: [] },

    // Evidence & Ledger
    evidence: { type: [evidenceReferenceSchema], default: [] },
    claims: { type: [claimRecordSchema], default: [] },
    artifacts: { type: [agentArtifactSchema], default: [] },
    toolCalls: { type: [toolCallRecordSchema], default: [] },

    // Auditing & Logs
    stepLogs: [
      {
        title: String,
        detail: String,
        phase: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    warnings: { type: [String], default: [] },
    errors: { type: [String], default: [] },

    // Verification & Final Answer
    verificationStatus: {
      type: String,
      enum: [
        'UNVERIFIED',
        'VERIFIED',
        'PARTIALLY_SUPPORTED',
        'INSUFFICIENT_EVIDENCE',
        'INSUFFICIENT_CORPUS',
        'SCOPED_SINGLE_SOURCE',
        'SCOPED_SELECTED_CORPUS',
        'FAILED',
      ],
      default: 'UNVERIFIED',
    },
    finalOutput: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Human-in-the-loop Gates
    approvalRequests: { type: [approvalRequestSchema], default: [] },

    // Checkpointing & Persistence
    lastCheckpoint: { type: mongoose.Schema.Types.Mixed, default: null },
    checkpoints: { type: [checkpointSchema], default: [] },

    // Token & Cost Control
    budget: {
      maxTokens: { type: Number, default: 80000 },
      tokensUsed: { type: Number, default: 0 },
      llmCalls: { type: Number, default: 0 },
      embeddingCalls: { type: Number, default: 0 },
      estimatedCostUsd: { type: Number, default: 0.0 },
    },

    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  }
);

agentRunSchema.index({ user: 1, createdAt: -1 });
agentRunSchema.index({ project: 1, createdAt: -1 });

const AgentRun = mongoose.models.AgentRun || mongoose.model('AgentRun', agentRunSchema);

module.exports = AgentRun;
