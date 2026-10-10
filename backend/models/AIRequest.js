const mongoose = require('mongoose');

const aiRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['rag', 'chat', 'research', 'embedding'], required: true },
  knowledgeBaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeBase', default: null },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
  status: { type: String, enum: ['success', 'failed'], required: true },
  latencyMs: { type: Number, default: 0 },
  errorCode: { type: String, default: '' },
}, { timestamps: true });

aiRequestSchema.index({ type: 1, createdAt: -1 });
module.exports = mongoose.models.AIRequest || mongoose.model('AIRequest', aiRequestSchema);
