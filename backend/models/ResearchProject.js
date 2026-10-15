const mongoose = require('mongoose');

const experimentResultSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    modelName: { type: String, required: true },
    model: { type: String, default: '' },
    benchmark: { type: String, default: '' },
    dataset: { type: String, default: 'Benchmark Dataset' },
    task: { type: String, default: '' },
    split: { type: String, default: 'Test' },
    metric: { type: String, required: true },
    value: { type: Number, required: true },
    unit: { type: String, default: '%' },
    runIds: { type: [String], default: [] },
    runId: { type: String, default: '' },
    seeds: { type: [Number], default: [] },
    sourceArtifactId: { type: String, default: '' },
    sourceFile: { type: String, default: '' },
    notes: { type: String, default: '' },
    sourceType: { type: String, default: 'user_supplied_result' },
    verificationStatus: {
      type: String,
      enum: ['EXAMPLE', 'DRAFT', 'USER_ENTERED', 'PROVENANCE_PENDING', 'VERIFIED_EXPERIMENT'],
      default: 'USER_ENTERED',
    },
    verified: { type: Boolean, default: false },
  },
  { _id: false }
);

const experimentRunSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    projectId: { type: String, default: '' },
    modelName: { type: String, required: true },
    modelVariant: { type: String, default: 'Base' },
    benchmark: { type: String, required: true },
    task: { type: String, default: 'Default Task' },
    dataset: { type: String, default: 'Standard Benchmark' },
    split: { type: String, default: 'Test' },
    metric: { type: String, required: true },
    value: { type: Number, default: null },
    unit: { type: String, default: '%' },
    seed: { type: Number, default: 42 },
    runIndex: { type: Number, default: 1 },
    checkpoint: { type: String, default: '' },
    evaluationEpisodes: { type: Number, default: 100 },
    sourceFileIds: { type: [String], default: [] },
    sourceFile: { type: String, default: '' },
    rawResultFile: { type: String, default: '' },
    hardware: {
      gpu: { type: String, default: '' },
      cpu: { type: String, default: '' },
      ram: { type: String, default: '' },
    },
    software: {
      python: { type: String, default: '' },
      framework: { type: String, default: '' },
      cuda: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['PLANNED', 'UPLOADED', 'PROVENANCE_PENDING', 'VERIFIED_EXPERIMENT', 'REJECTED'],
      default: 'PLANNED',
    },
    provenanceScore: { type: Number, default: 0 },
    verificationErrors: { type: [String], default: [] },
    notes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const safetyEventSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    experimentRunId: { type: String, default: '' },
    modelVariant: { type: String, default: '' },
    benchmark: { type: String, default: '' },
    eventType: {
      type: String,
      enum: [
        'TASK_FAILURE',
        'COLLISION',
        'UNSAFE_ACTION',
        'PROHIBITED_ACTION',
        'UNRECOVERABLE_STATE',
        'HIGH_CONFIDENCE_FAILURE',
        'FALSE_ABSTENTION',
        'RECOVERY_SUCCESS',
      ],
      required: true,
    },
    confidence: { type: Number, default: null },
    uncertainty: { type: Number, default: null },
    abstained: { type: Boolean, default: false },
    threshold: { type: Number, default: null },
    severity: { type: String, default: 'MEDIUM' },
    timestamp: { type: String, default: () => new Date().toISOString() },
    provenanceTrace: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const mathematicalDefinitionSchema = new mongoose.Schema(
  {
    equationId: { type: String, required: true },
    latex: { type: String, required: true },
    provenance: {
      type: String,
      enum: ['SOURCE_DERIVED', 'USER_DEFINED', 'PROJECT_DEFINED', 'MODEL_PROPOSED'],
      default: 'PROJECT_DEFINED',
    },
    symbols: [
      {
        symbol: { type: String, required: true },
        definition: { type: String, required: true },
        dimension: { type: String, default: '' },
        domain: { type: String, default: '' },
      },
    ],
    dimensions: { type: mongoose.Schema.Types.Mixed, default: {} },
    domain: { type: mongoose.Schema.Types.Mixed, default: {} },
    range: { type: mongoose.Schema.Types.Mixed, default: {} },
    normalization: { type: String, default: '' },
    implementationMapping: [
      {
        file: { type: String, default: '' },
        className: { type: String, default: '' },
        functionName: { type: String, default: '' },
        configKey: { type: String, default: '' },
        codeSnippet: { type: String, default: '' },
      },
    ],
    status: {
      type: String,
      enum: ['INCOMPLETE', 'PROPOSED', 'IMPLEMENTATION_MATCHED', 'VERIFIED'],
      default: 'PROPOSED',
    },
  },
  { _id: false }
);

const readinessDimensionSchema = new mongoose.Schema(
  {
    score: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['MISSING', 'PARTIAL', 'READY', 'BLOCKED'],
      default: 'MISSING',
    },
    missingItems: { type: [String], default: [] },
    warnings: { type: [String], default: [] },
    evidenceIds: { type: [String], default: [] },
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
    authors: [
      {
        name: { type: String, default: '' },
        affiliation: { type: String, default: '' },
        email: { type: String, default: '' },
        orcid: { type: String, default: '' },
        isCorresponding: { type: Boolean, default: false },
      },
    ],
    owner: {
      type: mongoose.Schema.Types.Mixed,
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
    evaluationProfiles: { type: [mongoose.Schema.Types.Mixed], default: [] },
    compatibilityChecks: { type: [mongoose.Schema.Types.Mixed], default: [] },
    comparableEvaluationPlans: { type: [mongoose.Schema.Types.Mixed], default: [] },
    benchmarkResults: { type: [mongoose.Schema.Types.Mixed], default: [] },
    comparisonStrategy: {
      type: String,
      enum: ['QUALITATIVE', 'STANDARDIZED_PLAN', 'DIRECT', 'PENDING'],
      default: 'PENDING',
    },
    benchmarkCompatibility: {
      status: { type: String, default: '' },
      verdictTitle: { type: String, default: '' },
      explanation: { type: String, default: '' },
      factors: { type: [mongoose.Schema.Types.Mixed], default: [] },
      caveatWarning: { type: String, default: '' },
      reasons: { type: [String], default: [] },
      blockers: { type: [String], default: [] },
      warnings: { type: [String], default: [] },
      prohibitedClaims: { type: [String], default: [] },
      issuesCount: { type: Number, default: 0 },
      isDirectlyComparable: { type: Boolean, default: false },
      comparisonStrategy: { type: String, default: 'PENDING' },
      groups: { type: [mongoose.Schema.Types.Mixed], default: [] },
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
      authors: { type: [mongoose.Schema.Types.Mixed], default: [] },
      keywords: { type: [String], default: [] },
      appendices: { type: [mongoose.Schema.Types.Mixed], default: [] },
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

    // Empirical Evidence, Runs & Safety Validation
    experimentRuns: { type: [experimentRunSchema], default: [] },
    safetyEvents: { type: [safetyEventSchema], default: [] },
    mathematicalDefinitions: { type: [mathematicalDefinitionSchema], default: [] },

    // Reproducibility Manifest (Items 8, 9, 19, 20)
    reproducibilityManifest: {
      repositoryUrl: { type: String, default: '' },
      branch: { type: String, default: 'main' },
      commitHash: { type: String, default: '' },
      pythonVersion: { type: String, default: '3.10.12' },
      frameworkVersions: { type: mongoose.Schema.Types.Mixed, default: { torch: '2.2.0', torchvision: '0.17.0' } },
      cudaVersion: { type: String, default: '12.1' },
      gpu: { type: String, default: 'NVIDIA A100-SXM4-80GB' },
      cpu: { type: String, default: 'AMD EPYC 7763 64-Core Processor' },
      ram: { type: String, default: '128GB' },
      benchmarkVersions: { type: mongoose.Schema.Types.Mixed, default: { calvin: 'commit d7a31b2', libero: 'commit 9c4f1e0' } },
      datasetVersion: { type: String, default: '1.0' },
      split: { type: String, default: 'ABC->D' },
      preprocessing: { type: String, default: 'Standard ImageNet normalization + 224x224 center crop' },
      checkpoint: { type: String, default: '' },
      optimizer: { type: String, default: 'AdamW' },
      learningRate: { type: Number, default: 0.0001 },
      batchSize: { type: Number, default: 32 },
      epochs: { type: Number, default: 20 },
      seeds: { type: [Number], default: [42, 1337, 2024, 7, 99] },
      memorySize: { type: Number, default: 5000 },
      retrievalTopK: { type: Number, default: 5 },
      uncertaintyThreshold: { type: Number, default: 0.35 },
      evaluationBudget: { type: String, default: '500 evaluation episodes per split' },
      hyperparameterSelectionMethod: { type: String, default: 'Validation loss and risk-coverage optimization' },
      sourceCodeArtifacts: {
        type: [
          {
            filename: String,
            fileType: String,
            size: Number,
            path: String,
            uploadedAt: { type: Date, default: Date.now },
          },
        ],
        default: [],
      },
    },

    // Canonical 6-Dimension Research Evidence Readiness (Item 2)
    evidenceReadiness: {
      experimentalEvidence: { type: readinessDimensionSchema, default: () => ({ score: 0, status: 'MISSING' }) },
      statisticalValidation: { type: readinessDimensionSchema, default: () => ({ score: 0, status: 'MISSING' }) },
      safetyValidation: { type: readinessDimensionSchema, default: () => ({ score: 0, status: 'MISSING' }) },
      reproducibility: { type: readinessDimensionSchema, default: () => ({ score: 0, status: 'MISSING' }) },
      references: { type: readinessDimensionSchema, default: () => ({ score: 0, status: 'MISSING' }) },
      layoutFormatting: { type: readinessDimensionSchema, default: () => ({ score: 0, status: 'MISSING' }) },
      overallPaperScore: { type: Number, default: 0 },
      submissionReadinessScore: { type: Number, default: 0 },
      isEmpiricalReady: { type: Boolean, default: false },
      blockingGates: { type: [String], default: [] },
      updatedAt: { type: Date, default: Date.now },
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
      if (!r.verificationStatus) {
        r.verificationStatus = r.verified && (r.runId || (r.runIds && r.runIds.length > 0)) ? 'VERIFIED_EXPERIMENT' : 'USER_ENTERED';
      }
      if (r.runId && (!r.runIds || r.runIds.length === 0)) {
        r.runIds = [r.runId];
      }
      const isVerifiedExp = r.verificationStatus === 'VERIFIED_EXPERIMENT' && Array.isArray(r.runIds) && r.runIds.length > 0;
      r.verified = isVerifiedExp;
    });
  }
  next();
});

researchProjectSchema.index({ owner: 1, updatedAt: -1 });

const ResearchProject =
  mongoose.models.ResearchProject ||
  mongoose.model('ResearchProject', researchProjectSchema);

module.exports = ResearchProject;
