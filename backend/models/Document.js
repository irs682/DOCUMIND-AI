const mongoose = require('mongoose');
const { evidenceObjectSchema } = require('./EvidenceObject');

const chunkSchema = new mongoose.Schema({
  index: Number,
  text: String,
  tokenCount: Number,
  embedding: [Number],
  pageNumber: Number,
  section: String,
  subsection: String,
  requirementId: String,
  requirementName: String,
  contentType: String,
  objectType: String,
  objectId: String,
  figureNumber: String,
  imagePath: String,
  caption: String,
  sourceMethod: String,
  bbox: [Number],
  structuredData: mongoose.Schema.Types.Mixed,
  parentSection: String,
  parentChunkId: String,
  isTable: Boolean,
  isFigure: Boolean,
  tableMetadata: mongoose.Schema.Types.Mixed,
  figureMetadata: mongoose.Schema.Types.Mixed,
  isReference: Boolean,
  metadata: mongoose.Schema.Types.Mixed,
  evidence: mongoose.Schema.Types.Mixed,
  embeddingProvider: String,
  embeddingModel: String,
  embeddingDimension: Number,
  embeddingVersion: String,
});

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    size: {
      type: Number,
      default: 0,
    },
    formattedSize: {
      type: String,
      default: '1.2 MB',
    },
    status: {
      type: String,
      enum: [
        'uploaded',
        'processing',
        'validating',
        'loading',
        'extracting',
        'ocr_processing',
        'vision_processing',
        'table_extraction',
        'cleaning',
        'splitting',
        'embedding',
        'indexing',
        'ready',
        'indexed',
        'extraction_failed',
        'validation_failed',
        'chunking_failed',
        'embedding_failed',
        'index_failed',
        'failed',
        'pending',
      ],
      default: 'uploaded',
    },
    processingStep: {
      type: String,
      default: '01 Upload complete',
    },
    tables: {
      type: [Object],
      default: [],
    },
    tableCount: {
      type: Number,
      default: 0,
    },
    figures: {
      type: [Object],
      default: [],
    },
    figureCount: {
      type: Number,
      default: 0,
    },
    evidenceObjects: {
      type: [evidenceObjectSchema],
      default: [],
    },
    evidenceObjectsCount: {
      type: Number,
      default: 0,
    },
    diagnostics: {
      textBlocks: { type: Number, default: 0 },
      tablesDetected: { type: Number, default: 0 },
      tablesParsed: { type: Number, default: 0 },
      figuresDetected: { type: Number, default: 0 },
      figuresProcessed: { type: Number, default: 0 },
      ocrPages: { type: Number, default: 0 },
      failedObjects: { type: Number, default: 0 },
      evidenceObjectsCount: { type: Number, default: 0 },
    },
    ocrUsed: {
      type: Boolean,
      default: false,
    },
    storedFilename: {
      type: String,
      default: '',
    },
    stored_filename: {
      type: String,
      default: '',
    },
    original_filename: {
      type: String,
      default: '',
    },
    file_path: {
      type: String,
      default: '',
    },
    file_size: {
      type: Number,
      default: 0,
    },
    mime_type: {
      type: String,
      default: 'application/pdf',
    },
    errorMessage: {
      type: String,
      default: '',
    },
    error_message: {
      type: String,
      default: '',
    },
    knowledgeBase: {
      type: String,
      default: 'Finance & Legal',
    },
    knowledgeBaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeBase',
      default: null,
    },
    knowledgeBaseIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'KnowledgeBase',
      },
    ],
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
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
    user_id: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      index: true,
    },
    chunksCount: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    embeddingProvider: { type: String, default: '' },
    embeddingModel: { type: String, default: '' },
    embeddingDimension: { type: Number, default: 0 },
    embeddingVersion: { type: String, default: '' },
    summary: {
      type: String,
      default: '',
    },
    fullText: {
      type: String,
      default: '',
    },
    qualityScore: {
      type: Number,
      default: 0,
    },
    failedRules: {
      type: [String],
      default: [],
    },
    vectorsCount: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      enum: [
        'Research Paper',
        'Contract',
        'Invoice',
        'Resume',
        'Report',
        'Policy',
        'Technical Manual',
        'Financial Document',
        'Legal Document',
        'Other',
      ],
      default: 'Other',
    },
    classificationConfidence: {
      type: Number,
      default: 0.95,
    },
    chunks: [chunkSchema],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

documentSchema.virtual('document_id').get(function () {
  return this._id ? this._id.toString() : '';
});

// Backward-compatibility timestamps getters
documentSchema.virtual('createdAt').get(function () {
  return this.created_at;
});
documentSchema.virtual('updatedAt').get(function () {
  return this.updated_at;
});

documentSchema.index({ owner: 1, knowledgeBaseId: 1, created_at: -1 });
documentSchema.index({ owner: 1, knowledgeBaseIds: 1 });

const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);
module.exports = Document;
