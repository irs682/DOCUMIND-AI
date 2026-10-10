const mongoose = require('mongoose');

const citationSchema = new mongoose.Schema({
  documentName: String,
  similarityScore: Number,
  pageNumber: Number,
  snippet: String,
  knowledgeBase: String,
});

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  citations: [citationSchema],
  status: {
    type: String,
    enum: ['pending', 'streaming', 'completed', 'cancelled', 'failed', 'interrupted'],
    default: 'completed',
  },
  generationId: {
    type: String,
    default: null,
  },
  finishReason: {
    type: String,
    default: null,
  },
  timeToFirstTokenMs: {
    type: Number,
    default: null,
  },
  durationMs: {
    type: Number,
    default: null,
  },
  isBookmarked: {
    type: Boolean,
    default: false,
  },
  documentIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },
  ],
  parentMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  timestamp: {
    type: String,
    default: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
});

const chatSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    knowledgeBaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeBase', default: null },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    title: {
      type: String,
      default: 'New RAG Chat',
      trim: true,
    },
    titleSource: {
      type: String,
      enum: ['auto', 'user'],
      default: 'auto',
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
    selectedDocumentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],
    lastMessagePreview: {
      type: String,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    model: {
      type: String,
      default: 'auto',
    },
    rollingSummary: {
      type: String,
      default: '',
    },
    messages: [messageSchema],
  },
  {
    timestamps: true,
  }
);

chatSessionSchema.index({ user: 1, status: 1, isPinned: -1, lastMessageAt: -1 });
chatSessionSchema.index({ user: 1, lastMessageAt: -1 });
chatSessionSchema.index({ user: 1, updatedAt: -1 });

// Text search on title and embedded message content for user search
chatSessionSchema.index({ title: 'text', 'messages.text': 'text' });

chatSessionSchema.virtual('messageCount').get(function getMessageCount() {
  return Array.isArray(this.messages) ? this.messages.length : 0;
});
chatSessionSchema.set('toJSON', { virtuals: true });
chatSessionSchema.set('toObject', { virtuals: true });

const ChatSession = mongoose.models.ChatSession || mongoose.model('ChatSession', chatSessionSchema);
module.exports = ChatSession;

