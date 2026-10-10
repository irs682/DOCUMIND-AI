const mongoose = require('mongoose');

const experimentResultSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    modelName: { type: String, required: true },
    model: { type: String, default: '' },
    dataset: { type: String, default: 'Benchmark Dataset' },
    split: { type: String, default: 'Test' },
    metric: { type: String, required: true },
    value: { type: Number, required: true },
    unit: { type: String, default: '%' },
    runId: { type: String, default: '' },
    sourceFile: { type: String, default: '' },
    notes: { type: String, default: '' },
    sourceType: { type: String, default: 'user_supplied_result' },
    verified: { type: Boolean, default: true },
  },
  { _id: false }
);

const researchProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'active', 'completed', 'archived'],
      default: 'active',
      index: true,
    },
    currentStep: {
      type: Number,
      default: 1, // 1 to 11
      min: 1,
      max: 11,
    },
    documentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],

    // Step 2: Research Goal
    researchTopic: { type: String, default: '', trim: true },
    mainResearchProblem: { type: String, default: '', trim: true },
    researchProblem: { type: String, default: '', trim: true },
    improvementGoal: { type: String, default: '', trim: true },
    improvementsDesired: { type: String, default: '', trim: true },
    focusAreas: { type: String, default: '', trim: true },

    // Step 3: Related Work & Profiles
    paperProfiles: { type: [mongoose.Schema.Types.Mixed], default: [] },
    relatedWork: {
      table: { type: [mongoose.Schema.Types.Mixed], default: [] },
      commonApproaches: { type: String, default: '' },
      mainDifferences: { type: String, default: '' },
      strongestMethods: { type: String, default: '' },
      commonDatasets: { type: String, default: '' },
      commonBenchmarks: { type: String, default: '' },
      commonLimitations: { type: String, default: '' },
    },

    // Step 4: Comparison & Benchmark Check
    comparisonMatrix: { type: [mongoose.Schema.Types.Mixed], default: [] },
    benchmarkCompatibility: {
      status: { type: String, default: '' },
      verdictTitle: { type: String, default: '' },
      explanation: { type: String, default: '' },
      factors: { type: [mongoose.Schema.Types.Mixed], default: [] },
      caveatWarning: { type: String, default: '' },
    },

    // Step 5: Research Gaps
    researchGaps: {
      type: [
        {
          id: String,
          title: String,
          category: String,
          description: String,
          evidenceQuote: String,
          supportingPapers: [String],
          impact: String,
        },
      ],
      default: [],
    },

    // Step 6: Questions & Hypotheses
    researchQuestions: {
      type: [
        {
          id: String,
          text: String,
          linkedGap: String,
        },
      ],
      default: [],
    },
    hypotheses: {
      type: [
        {
          id: String,
          text: String,
          linkedQuestion: String,
        },
      ],
      default: [],
    },

    // Step 7: Methodology
    methodology: {
      proposedArchitecture: { type: String, default: '' },
      dataset: { type: String, default: '' },
      preprocessing: { type: String, default: '' },
      model: { type: String, default: '' },
      trainingStrategy: { type: String, default: '' },
      algorithm: { type: String, default: '' },
      ablationPlan: { type: String, default: '' },
      statisticalAnalysis: { type: String, default: '' },
      flowchartSteps: { type: [String], default: [] },
    },

    // Step 8: Benchmarks, Baselines & Metrics
    benchmarks: {
      type: [
        {
          name: String,
          domain: String,
          description: String,
        },
      ],
      default: [],
    },
    baselines: {
      type: [
        {
          name: String,
          sourcePaper: String,
          metricName: String,
          score: String,
          citation: String,
        },
      ],
      default: [],
    },
    metrics: {
      type: [
        {
          name: String,
          definition: String,
          purpose: String,
        },
      ],
      default: [],
    },

    // Step 9: User Experiment Results
    userResults: { type: [experimentResultSchema], default: [] },
    resultComparison: {
      comparisonRows: { type: [mongoose.Schema.Types.Mixed], default: [] },
      absoluteImprovement: { type: String, default: '' },
      relativeImprovement: { type: String, default: '' },
      percentagePointDiff: { type: String, default: '' },
      isFairComparison: { type: Boolean, default: true },
      fairComparisonVerdict: { type: String, default: '' },
    },

    // Step 10: Discussion
    discussion: {
      performanceAnalysis: { type: String, default: '' },
      generalizationAndRobustness: { type: String, default: '' },
      tradeoffsAndCosts: { type: String, default: '' },
      failureCases: { type: String, default: '' },
      hypothesesValidation: { type: String, default: '' },
      literatureRelationship: { type: String, default: '' },
      speculationDisclaimer: { type: String, default: '' },
    },

    // Step 11: Full Paper Draft
    generatedDraft: {
      title: { type: String, default: '' },
      abstract: { type: String, default: '' },
      sections: {
        type: [
          {
            heading: String,
            body: String,
            citations: [String],
          },
        ],
        default: [],
      },
      references: { type: [String], default: [] },
      resultsPending: { type: Boolean, default: false },
      resultsNotice: { type: String, default: '' },
      manuscriptMode: { type: String, default: 'pre_experimental' },
      qualityScore: { type: mongoose.Schema.Types.Mixed, default: {} },
      validationChecks: { type: [mongoose.Schema.Types.Mixed], default: [] },
      statusBadge: { type: mongoose.Schema.Types.Mixed, default: {} },
      canonicalSources: { type: [mongoose.Schema.Types.Mixed], default: [] },
      manuscriptObjects: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },

    // First-Class Unified Manuscript Objects (Equations, Figures, Graphs, Tables, Images, Algorithms)
    manuscriptObjects: { type: [mongoose.Schema.Types.Mixed], default: [] },

    // Persistent Evidence Ledger
    evidenceLedger: { type: [mongoose.Schema.Types.Mixed], default: [] },

    // Manuscript Claims to Evidence Ledger (Section 2)
    claimsLedger: { type: [mongoose.Schema.Types.Mixed], default: [] },

    // Manuscript Appendices / Supplementary Materials (Section 22)
    appendices: { type: [mongoose.Schema.Types.Mixed], default: [] },

    // Revision History & Draft Snapshots (Section 17)
    manuscriptRevisions: {
      type: [
        {
          versionNumber: Number,
          label: String,
          summary: String,
          draftSnapshot: mongoose.Schema.Types.Mixed,
          objectsSnapshot: mongoose.Schema.Types.Mixed,
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    // Reproducibility Checklist & Statements (Section 19, 20, 21)
    reproducibilityChecklist: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Journal Template & Formatting Settings (Section 12, 13)
    journalTemplate: {
      templateId: { type: String, default: 'generic_academic' },
      citationStyle: { type: String, default: 'IEEE' },
      columnCount: { type: Number, default: 1 },
      pageSize: { type: String, default: 'A4' },
      fontSize: { type: String, default: '10pt' },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

researchProjectSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

researchProjectSchema.pre('save', function (next) {
  if (this.mainResearchProblem && !this.researchProblem) {
    this.researchProblem = this.mainResearchProblem;
  } else if (this.researchProblem && !this.mainResearchProblem) {
    this.mainResearchProblem = this.researchProblem;
  }

  if (this.improvementGoal && !this.improvementsDesired) {
    this.improvementsDesired = this.improvementGoal;
  } else if (this.improvementsDesired && !this.improvementGoal) {
    this.improvementGoal = this.improvementsDesired;
  }

  if (this.userResults && Array.isArray(this.userResults)) {
    this.userResults.forEach((r) => {
      if (!r.modelName && r.model) r.modelName = r.model;
      if (!r.model && r.modelName) r.model = r.modelName;
      if (!r.sourceType) r.sourceType = 'user_supplied_result';
      if (r.verified === undefined) r.verified = true;
    });
  }
  next();
});

researchProjectSchema.index({ owner: 1, updatedAt: -1 });

const ResearchProject =
  mongoose.models.ResearchProject ||
  mongoose.model('ResearchProject', researchProjectSchema);

module.exports = ResearchProject;
