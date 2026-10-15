const mongoose = require('mongoose');

const knowledgeBaseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    isPrivate: {
      type: Boolean,
      default: true,
    },
    embeddingModel: {
      type: String,
      default: 'text-embedding-3-small',
    },
    owner: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    docCount: {
      type: Number,
      default: 0,
    },
    vectorCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

knowledgeBaseSchema.index({ owner: 1, name: 1 }, { unique: true });

const KnowledgeBase = mongoose.models.KnowledgeBase || mongoose.model('KnowledgeBase', knowledgeBaseSchema);
module.exports = KnowledgeBase;
