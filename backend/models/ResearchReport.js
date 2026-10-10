const mongoose = require('mongoose');

const reportSectionSchema = new mongoose.Schema({
  heading: String,
  body: String,
  citations: [String],
});

const paperProfileSchema = new mongoose.Schema(
  {
    documentId: { type: String, default: '' },
    documentName: { type: String, default: '' },
    title: { type: String, default: '' },
    authors: { type: [String], default: [] },
    year: { type: String, default: '' },
    abstract: { type: String, default: '' },
    problemStatement: { type: String, default: '' },
    objectives: { type: [String], default: [] },
    researchQuestions: { type: [String], default: [] },
    methodology: { type: String, default: '' },
    modelsAlgorithms: { type: [String], default: [] },
    datasets: { type: [String], default: [] },
    sampleSize: { type: String, default: '' },
    experimentalSetup: { type: String, default: '' },
    boundaryConditions: { type: String, default: '' },
    equations: { type: [String], default: [] },
    metrics: { type: [String], default: [] },
    tables: { type: [mongoose.Schema.Types.Mixed], default: [] },
    figures: { type: [mongoose.Schema.Types.Mixed], default: [] },
    results: { type: [mongoose.Schema.Types.Mixed], default: [] },
    limitations: { type: [String], default: [] },
    conclusions: { type: [String], default: [] },
    futureWork: { type: [String], default: [] },
  },
  { _id: false }
);

const researchReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    knowledgeBaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeBase', default: null },
    knowledgeBaseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeBase' }],
    documentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],

    topic: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: '',
    },
    researchMode: {
      type: String,
      enum: [
        'paper_comparison',
        'synthesis',
        'gap_analysis',
        'idea_generation',
        'proposal',
        'review_paper',
        'original_research_draft',
      ],
      default: 'synthesis',
      index: true,
    },
    sourceMode: {
      type: String,
      enum: [
        'uploaded_documents',
        'knowledge_base',
        'all_knowledge_bases',
        'combined',
        'external',
      ],
      default: 'combined',
    },
    depth: {
      type: String,
      enum: ['quick', 'standard', 'deep'],
      default: 'standard',
    },
    outputType: {
      type: String,
      default: 'Executive Synthesis',
    },
    paperType: {
      type: String,
      default: 'Literature Review',
    },
    formatStyle: {
      type: String,
      default: 'Generic Academic',
    },
    numberOfPapers: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed', 'partial'],
      default: 'completed',
    },

    executiveSummary: {
      type: String,
      default: '',
    },
    sections: [reportSectionSchema],
    citations: [
      {
        documentName: String,
        documentId: String,
        similarityScore: Number,
        pageNumber: Number,
        section: String,
        objectType: String,
        objectId: String,
        citationText: String,
        knowledgeBase: String,
      },
    ],

    // Structured Academic Artifacts
    paperProfiles: [paperProfileSchema],
    comparisonMatrix: [mongoose.Schema.Types.Mixed],
    evidenceLedger: [mongoose.Schema.Types.Mixed],
    gapAnalysis: [mongoose.Schema.Types.Mixed],
    researchIdeas: [mongoose.Schema.Types.Mixed],
    proposal: { type: mongoose.Schema.Types.Mixed, default: null },
    paperDraft: { type: mongoose.Schema.Types.Mixed, default: null },
    conflictReport: { type: mongoose.Schema.Types.Mixed, default: null },
    benchmarkCompatibility: { type: mongoose.Schema.Types.Mixed, default: null },

    userResultsProvided: { type: Boolean, default: false },
    resultsNotice: { type: String, default: '' },

    metrics: {
      papersAnalyzed: { type: Number, default: 0 },
      evidenceItems: { type: Number, default: 0 },
      tablesInspected: { type: Number, default: 0 },
      figuresInspected: { type: Number, default: 0 },
      claimsVerified: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

researchReportSchema.index({ user: 1, createdAt: -1 });
researchReportSchema.index({ user: 1, researchMode: 1 });

const ResearchReport = mongoose.models.ResearchReport || mongoose.model('ResearchReport', researchReportSchema);
module.exports = ResearchReport;
