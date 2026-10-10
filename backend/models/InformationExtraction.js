const mongoose = require('mongoose');

const batchStatsSchema = new mongoose.Schema(
  {
    totalBatches: { type: Number, default: 0, min: 0 },
    successfulBatches: { type: Number, default: 0, min: 0 },
    failedBatches: { type: Number, default: 0, min: 0 },
    totalItems: { type: Number, default: 0, min: 0 },
    duplicatesRemoved: { type: Number, default: 0, min: 0 },
    isPartial: { type: Boolean, default: false },
    errors: {
      type: [
        {
          batch: { type: Number, min: 0 },
          code: { type: String, default: '' },
          message: { type: String, default: '' },
        },
      ],
      default: [],
    },
  },
  { _id: false, suppressReservedKeysWarning: true }
);

/**
 * A persisted, document-grounded information-extraction request.
 *
 * The validated result stays intentionally flexible because preset categories
 * and user-defined schemas have different shapes. The extraction service is
 * responsible for validating every item before it is stored in result.
 */
const informationExtractionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    extractionTypes: {
      type: [String],
      default: [],
    },
    // Supports a normalized list of fields as well as a legacy/custom request
    // string while the extraction service converts it into customSchema.
    customFields: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    customSchema: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'QUEUED',
      index: true,
    },
    processingStep: {
      type: String,
      default: 'Preparing document',
    },
    errorCode: {
      type: String,
      default: '',
    },
    errorMessage: {
      type: String,
      default: '',
    },
    isPartial: {
      type: Boolean,
      default: false,
    },
    batchStats: {
      type: batchStatsSchema,
      default: () => ({}),
    },
    processingVersion: {
      type: String,
      default: 'information-extraction-v1',
    },
    requestFingerprint: {
      type: String,
      default: '',
      index: true,
    },
    // The source document has no standalone version model. Retaining its last
    // update timestamp lets the cache be invalidated when it is reprocessed.
    sourceDocumentUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

informationExtractionSchema.index({ user: 1, documentId: 1, createdAt: -1 });
informationExtractionSchema.index({ user: 1, documentId: 1, requestFingerprint: 1, status: 1 });
informationExtractionSchema.index({ projectId: 1, createdAt: -1 });

const InformationExtraction =
  mongoose.models.InformationExtraction ||
  mongoose.model('InformationExtraction', informationExtractionSchema);

module.exports = InformationExtraction;
