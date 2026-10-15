/**
 * DOCUMIND-AI Shared TypeScript Type Definitions
 * Unified data models for Web Workstation and Mobile Companion
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  institution?: string;
  avatar?: string;
  createdAt?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  biometricsEnabled?: boolean;
  offlineSyncEnabled?: boolean;
  defaultExportFormat: 'pdf' | 'latex' | 'docx';
}

export interface Document {
  id: string;
  _id?: string;
  title: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  status:
    | 'uploaded'
    | 'processing'
    | 'validating'
    | 'extracting'
    | 'indexed'
    | 'error'
    | 'failed';
  knowledgeBase?: string;
  knowledgeBaseId?: string;
  projectId?: string;
  summary?: string;
  extractedText?: string;
  authors?: string[];
  year?: number;
  doi?: string;
  citationCount?: number;
  chunksCount?: number;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBase {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  documentCount?: number;
  isPrivate?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PaperProfile {
  id: string;
  title: string;
  authors?: string[];
  year?: number;
  venue?: string;
  abstract?: string;
  keyContributions?: string[];
  limitations?: string[];
  methodSummary?: string;
  citationKey?: string;
  pdfUrl?: string;
}

export interface ResearchGap {
  id: string;
  title: string;
  description: string;
  category: 'theoretical' | 'empirical' | 'methodological' | 'dataset';
  severity: 'high' | 'medium' | 'low';
  addressedByProject?: boolean;
}

export interface ResearchQuestion {
  id: string;
  rqCode: string; // e.g. "RQ1"
  question: string;
  rationale: string;
  boundMetric?: string;
  targetBaseline?: string;
}

export interface Hypothesis {
  id: string;
  hCode: string; // e.g. "H1"
  statement: string;
  nullHypothesis?: string;
  evaluationMethod?: string;
}

export interface Methodology {
  proposedArchitecture?: string;
  mathematicalFormulation?: string;
  novelComponents?: string[];
  trainingProcedure?: string;
  complexityAnalysis?: string;
  assumptions?: string[];
}

export interface Baseline {
  id: string;
  name: string;
  sourcePaper: string;
  reportedPerformance: Record<string, number | string>;
  isControlled: boolean;
}

export interface Benchmark {
  id: string;
  datasetName: string;
  metricName: string;
  targetScore?: number | string;
  split: string;
}

export interface Result {
  id: string;
  experimentName: string;
  metric: string;
  value: number | string;
  baselineValue?: number | string;
  gain?: string;
  verified: boolean;
  runDate?: string;
  dataset?: string;
}

export interface ManuscriptSection {
  id: string;
  sectionNumber: number;
  title: string;
  content: string;
  wordCount?: number;
  citations?: string[];
  status: 'draft' | 'reviewed' | 'approved';
}

export interface Figure {
  id: string;
  figureNumber: number;
  title: string;
  caption: string;
  imageUrl?: string;
  svgData?: string;
  type: 'architecture' | 'benchmark_bar' | 'convergence_line' | 'ablation';
}

export interface Equation {
  id: string;
  equationNumber: number;
  label: string;
  latex: string;
  description: string;
}

export interface Table {
  id: string;
  tableNumber: number;
  title: string;
  headers: string[];
  rows: (string | number)[][];
  caption?: string;
}

export interface Manuscript {
  title: string;
  abstract?: string;
  authors?: string[];
  affiliations?: string[];
  sections: ManuscriptSection[];
  figures?: Figure[];
  equations?: Equation[];
  tables?: Table[];
  references?: string[];
  version: number;
  lastGeneratedAt?: string;
}

export interface PillarScores {
  literature: number;
  methodology: number;
  experiments: number;
  manuscript: number;
  integrity: number;
  reproducibility: number;
}

export interface ResearchReadiness {
  score: number;
  label: string;
  pillars: PillarScores;
}

export type CompatibilityStatus =
  | 'DIRECTLY_COMPARABLE'
  | 'PARTIALLY_COMPARABLE'
  | 'NOT_DIRECTLY_COMPARABLE'
  | 'INSUFFICIENT_INFORMATION';

export type FieldCompatibility =
  | 'MATCH'
  | 'DIFFERENT'
  | 'NOT_REPORTED'
  | 'UNKNOWN';

export type BaselineQuality =
  | 'STRONG_BASELINE'
  | 'STANDARD_BASELINE'
  | 'WEAK_OR_UNTUNED_BASELINE'
  | 'UNKNOWN_BASELINE_QUALITY';

export interface EvaluationProfile {
  id?: string;
  sourceId?: string;
  documentId?: string;
  modelName?: string;
  paperTitle?: string;

  benchmark?: string;
  dataset?: string;
  task?: string;
  split?: string;

  metric?: string;
  metricDefinition?: string;
  unit?: string;

  evaluationEpisodes?: number | 'NOT_REPORTED';
  runs?: number | 'NOT_REPORTED';
  seeds?: number[] | 'NOT_REPORTED';

  hardware?: string;
  computeBudget?: string;

  evaluationProtocol?: string;
  checkpoint?: string;
  baselineQuality?: BaselineQuality;

  provenance: {
    sourceIds: string[];
    evidenceIds: string[];
    rawSnippets?: string[];
  };
}

export interface CompatibilityCheck {
  id: string;
  leftProfileId: string;
  rightProfileId: string;
  leftModelName?: string;
  rightModelName?: string;

  overallStatus: CompatibilityStatus;

  fields: {
    benchmark: FieldCompatibility;
    task: FieldCompatibility;
    dataset: FieldCompatibility;
    split: FieldCompatibility;
    metric: FieldCompatibility;
    metricDefinition?: FieldCompatibility;
    unit: FieldCompatibility;
    evaluationEpisodes: FieldCompatibility;
    runs: FieldCompatibility;
    hardware: FieldCompatibility;
    computeBudget: FieldCompatibility;
    evaluationProtocol: FieldCompatibility;
    checkpoint: FieldCompatibility;
  };

  reasons: string[];
  blockers: string[];
  warnings: string[];
}

export interface ComparableEvaluationPlan {
  id: string;
  projectId: string;

  benchmark: string;
  task: string;
  dataset?: string;
  split?: string;

  metric: string;
  metricDefinition?: string;
  unit: string;

  evaluationEpisodes?: number;
  runs?: number;
  seeds?: number[];

  baselineModelIds: string[];
  baselineModelNames?: string[];

  evaluationProtocol?: string;
  hardwareConstraints?: string;
  notes?: string;

  status: 'DRAFT' | 'APPROVED' | 'EXECUTED';
  createdAt?: string;
  updatedAt?: string;
}

export interface BenchmarkResult {
  id: string;
  evaluationPlanId?: string;

  modelId: string;
  modelName?: string;
  benchmark: string;
  task: string;
  split?: string;

  metric: string;
  value: number;
  unit: string;

  runId?: string;
  seed?: number;
  sourceFileId?: string;
  sourceFileName?: string;

  verificationStatus:
    | 'USER_ENTERED'
    | 'PROVENANCE_PENDING'
    | 'VERIFIED_EXPERIMENT';
  createdAt?: string;
}

export interface CompatibilityGroup {
  id: string;
  name: string;
  benchmark: string;
  task: string;
  split: string;
  metric: string;
  models: {
    profileId?: string;
    modelName: string;
    score?: string | number;
    status: string;
  }[];
}

export interface BenchmarkCompatibilityReport {
  status: CompatibilityStatus;
  verdictTitle: string;
  explanation: string;
  factors: {
    name: string;
    status: 'aligned' | 'divergent' | 'conditional' | 'varying';
    note: string;
    pass?: boolean;
  }[];
  caveatWarning: string;
  checks?: CompatibilityCheck[];
  groups?: CompatibilityGroup[];
  reasons?: string[];
  blockers?: string[];
  warnings?: string[];
  prohibitedClaims?: string[];
  comparisonStrategy?: 'QUALITATIVE' | 'STANDARDIZED_PLAN' | 'DIRECT' | 'PENDING';
  isDirectlyComparable: boolean;
}

export interface ResearchProject {
  id: string;
  _id?: string;
  title: string;
  topic?: string;
  researchTopic?: string;
  description?: string;
  status: 'active' | 'draft' | 'completed' | 'archived';
  currentStep: number;
  workflowProgress: number;
  researchReadiness: ResearchReadiness;
  paperProfiles?: PaperProfile[];
  evaluationProfiles?: EvaluationProfile[];
  compatibilityChecks?: CompatibilityCheck[];
  comparableEvaluationPlans?: ComparableEvaluationPlan[];
  benchmarkResults?: BenchmarkResult[];
  benchmarkCompatibility?: BenchmarkCompatibilityReport;
  comparisonStrategy?: 'QUALITATIVE' | 'STANDARDIZED_PLAN' | 'DIRECT' | 'PENDING';
  documentIds?: string[];
  researchGaps?: ResearchGap[];
  researchQuestions?: ResearchQuestion[];
  hypotheses?: Hypothesis[];
  methodology?: Methodology;
  baselines?: Baseline[];
  benchmarks?: Benchmark[];
  userResults?: Result[];
  generatedDraft?: Manuscript;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: {
    documentId?: string;
    documentTitle?: string;
    pageNumber?: number;
    snippet?: string;
    score?: number;
  }[];
  attachments?: string[];
}

export interface ChatSession {
  id: string;
  _id?: string;
  title: string;
  projectId?: string;
  documentIds?: string[];
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type:
    | 'paper_processed'
    | 'manuscript_ready'
    | 'audit_finished'
    | 'citation_issue'
    | 'pdf_exported'
    | 'result_updated';
  title: string;
  message: string;
  read: boolean;
  projectId?: string;
  documentId?: string;
  stepNumber?: number;
  deepLink?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  userId: string;
  action: string;
  targetTitle: string;
  targetType: 'project' | 'document' | 'chat' | 'manuscript' | 'export';
  targetId: string;
  timestamp: string;
}
