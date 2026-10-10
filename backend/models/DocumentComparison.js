const mongoose = require('mongoose');

const findingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'similarities',
        'differences',
        'added',
        'removed',
        'modified',
        'numericalChanges',
        'dateChanges',
        'requirementChanges',
        'tableChanges',
        'contradictions',
        'uniqueToA',
        'uniqueToB',
        'scopeComparison',
        'conceptComparison',
      ],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ['info', 'low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    sourceA: {
      documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
      documentName: String,
      page: Number,
      section: String,
      snippet: String,
    },
    sourceB: {
      documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
      documentName: String,
      page: Number,
      section: String,
      snippet: String,
    },
  },
  { _id: false }
);

const matchedSectionSchema = new mongoose.Schema(
  {
    sectionA: String,
    sectionB: String,
    similarity: Number,
    status: {
      type: String,
      enum: [
        'MATCHED',
        'PARTIAL_MATCH',
        'ADDED_IN_B',
        'REMOVED_FROM_B',
        'UNIQUE_TO_A',
        'UNIQUE_TO_B',
        'POSSIBLE_RENAMED',
        'LOW_CONFIDENCE_MATCH',
      ],
      default: 'MATCHED',
    },
    pageA: Number,
    pageB: Number,
  },
  { _id: false }
);

const documentComparisonSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    documentB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    documentAName: { type: String, default: '' },
    documentBName: { type: String, default: '' },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    comparisonMode: {
      type: String,
      enum: ['VERSION_COMPARISON', 'GENERAL_COMPARISON'],
      default: 'GENERAL_COMPARISON',
      index: true,
    },
    modeReasoning: {
      type: String,
      default: '',
    },
    metrics: {
      titleSimilarity: { type: Number, default: 0 },
      semanticSimilarity: { type: Number, default: 0 },
      sectionMatchRatio: { type: Number, default: 0 },
      structureSimilarity: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'QUEUED',
      index: true,
    },
    processingStep: {
      type: String,
      default: 'Preparing documents',
    },
    similarityScore: {
      type: Number,
      default: 0,
    },
    summary: {
      type: String,
      default: '',
    },
    sectionsMatched: [matchedSectionSchema],
    findings: [findingSchema],
    stats: {
      totalSimilarities: { type: Number, default: 0 },
      totalDifferences: { type: Number, default: 0 },
      totalAdded: { type: Number, default: 0 },
      totalRemoved: { type: Number, default: 0 },
      totalModified: { type: Number, default: 0 },
      totalUniqueToA: { type: Number, default: 0 },
      totalUniqueToB: { type: Number, default: 0 },
      totalNumericChanges: { type: Number, default: 0 },
      totalDateChanges: { type: Number, default: 0 },
      totalRequirementChanges: { type: Number, default: 0 },
      totalTableChanges: { type: Number, default: 0 },
      totalContradictions: { type: Number, default: 0 },
      sectionsCountA: { type: Number, default: 0 },
      sectionsCountB: { type: Number, default: 0 },
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

documentComparisonSchema.index({ user: 1, createdAt: -1 });
documentComparisonSchema.index({ documentA: 1, documentB: 1, user: 1 });

const DocumentComparison =
  mongoose.models.DocumentComparison ||
  mongoose.model('DocumentComparison', documentComparisonSchema);

module.exports = DocumentComparison;
