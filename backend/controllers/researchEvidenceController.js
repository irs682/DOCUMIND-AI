/**
 * DOCUMIND-AI Research Evidence, Statistics, Safety & Reproducibility Controller
 *
 * Implements the empirical evidence pipeline:
 * - 6-Dimension Evidence Readiness Dashboard
 * - Planned Experiment Variants (Base VLA, Ablations, Full MERA-VLA)
 * - Result Ingestion (CSV, JSON, TSV, Logs, Manual)
 * - Provenance Verification (Parsing != Verification)
 * - Deterministic Statistics & Hypothesis Testing Engine
 * - Safety Event & Risk-Coverage Curve Evaluation
 * - Reproducibility Manifest & Code/Config Ingestion
 * - Mathematical Completeness & Math-Code Consistency
 * - Guarded Paper Mode Transition (PRE_EXPERIMENTAL -> EMPIRICAL)
 */

const ResearchProject = require('../models/ResearchProject');
const {
  evaluateResearchEvidenceReadiness,
} = require('../services/researchEvidenceReadinessService');
const {
  ingestExperimentData,
  generatePlannedExperimentVariants,
  verifyExperimentRun,
  ingestCodeAndConfig,
} = require('../services/resultIngestionService');
const {
  computeDescriptiveStatistics,
  executeStatisticalAnalysis,
} = require('../services/statisticsEngineService');
const {
  computeSafetyMetrics,
  computeSafetyComparison,
  validateSafetyClaims,
} = require('../services/safetyValidationService');
const {
  CANONICAL_MERA_MATHEMATICAL_DEFINITIONS,
  verifyMathCodeConsistency,
} = require('../services/mathematicalCompletenessService');
const {
  assembleAcademicManuscript,
} = require('../services/academicManuscriptService');

const getOwnerFilter = (user) => {
  if (!user) return {};
  const conditions = [];
  if (user._id) {
    conditions.push({ owner: user._id });
    conditions.push({ owner: user._id.toString() });
  }
  if (user.id && (!user._id || user.id !== user._id.toString())) {
    conditions.push({ owner: user.id });
  }
  return conditions.length === 1 ? conditions[0] : { $or: conditions };
};

/**
 * GET /api/research/projects/:id/readiness
 * Retrieves canonical 6-dimension readiness computed dynamically from project state
 */
const getEvidenceReadiness = async (req, res) => {
  try {
    const { id } = req.params;
    const filter = getOwnerFilter(req.user);
    const project = await ResearchProject.findOne({ _id: id, ...filter });
    if (!project) {
      return res.status(404).json({ message: 'Research project not found.' });
    }

    const readiness = evaluateResearchEvidenceReadiness(project);
    project.evidenceReadiness = readiness;
    await project.save();

    return res.json({
      success: true,
      readiness,
      manuscriptMode: project.generatedDraft?.manuscriptMode || 'PRE_EXPERIMENTAL',
      isEmpiricalReady: readiness.isEmpiricalReady,
      blockingGates: readiness.blockingGates,
    });
  } catch (err) {
    console.error('[getEvidenceReadiness] Error:', err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/research/projects/:id/experiments/plan
 * Generates recommended planned experiment variants (Base VLA, Ablations, Full MERA-VLA)
 */
const planExperimentVariants = async (req, res) => {
  try {
    const { id } = req.params;
    const { benchmark = 'CALVIN' } = req.body;
    const filter = getOwnerFilter(req.user);
    const project = await ResearchProject.findOne({ _id: id, ...filter });
    if (!project) {
      return res.status(404).json({ message: 'Research project not found.' });
    }

    const planned = generatePlannedExperimentVariants(project._id.toString(), benchmark);

    // Filter out existing duplicates
    const existingVariants = new Set((project.experimentRuns || []).map((r) => `${r.modelVariant}_${r.benchmark}`));
    const newVariants = planned.filter((v) => !existingVariants.has(`${v.modelVariant}_${v.benchmark}`));

    project.experimentRuns.push(...newVariants);
    const readiness = evaluateResearchEvidenceReadiness(project);
    project.evidenceReadiness = readiness;
    await project.save();

    return res.json({
      success: true,
      message: `Added ${newVariants.length} planned experiment variants for ${benchmark}.`,
      experimentRuns: project.experimentRuns,
      readiness,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/research/projects/:id/experiments/ingest
 * Ingests and normalizes raw experiment results from CSV, JSON, TSV, or TXT logs
 */
const ingestResults = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, format = 'csv', fileName = 'results.csv', metadata = {} } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Experiment content or payload is required.' });
    }

    const filter = getOwnerFilter(req.user);
    const project = await ResearchProject.findOne({ _id: id, ...filter });
    if (!project) {
      return res.status(404).json({ message: 'Research project not found.' });
    }

    const ingestedRuns = ingestExperimentData(content, format, metadata, fileName);

    // Append to project experimentRuns
    project.experimentRuns.push(...ingestedRuns);

    // Also synchronize verified results into userResults for manuscript integration
    ingestedRuns.forEach((r) => {
      if (r.status === 'VERIFIED_EXPERIMENT') {
        project.userResults.push({
          id: r.id,
          modelName: r.modelName,
          model: r.modelVariant,
          benchmark: r.benchmark,
          dataset: r.dataset || r.benchmark,
          task: r.task,
          split: r.split,
          metric: r.metric,
          value: r.value,
          unit: r.unit,
          runIds: [r.id],
          runId: r.id,
          seeds: r.seed ? [r.seed] : [42],
          sourceFile: r.sourceFile,
          rawResultFile: r.sourceFile,
          verificationStatus: 'VERIFIED_EXPERIMENT',
          verified: true,
          notes: r.notes || `${r.modelVariant} evaluated on ${r.benchmark}`,
        });
      }
    });

    const readiness = evaluateResearchEvidenceReadiness(project);
    project.evidenceReadiness = readiness;
    await project.save();

    return res.json({
      success: true,
      message: `Ingested ${ingestedRuns.length} experiment runs (${ingestedRuns.filter((r) => r.status === 'VERIFIED_EXPERIMENT').length} verified).`,
      runs: ingestedRuns,
      readiness,
    });
  } catch (err) {
    console.error('[ingestResults] Error:', err);
    return res.status(400).json({ message: err.message });
  }
};

/**
 * POST /api/research/projects/:id/experiments/stats
 * Computes deterministic statistics across grouped experiment seeds and model variants
 */
const calculateExperimentStats = async (req, res) => {
  try {
    const { id } = req.params;
    const filter = getOwnerFilter(req.user);
    const project = await ResearchProject.findOne({ _id: id, ...filter });
    if (!project) {
      return res.status(404).json({ message: 'Research project not found.' });
    }

    const runs = (project.experimentRuns || []).filter((r) => typeof r.value === 'number');
    if (runs.length === 0) {
      return res.status(400).json({
        message: 'No numerical experiment runs available for statistical analysis.',
      });
    }

    // Group runs by modelVariant and benchmark
    const groups = {};
    runs.forEach((r) => {
      const key = `${r.modelVariant || r.modelName}__${r.benchmark}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    const groupStats = {};
    Object.keys(groups).forEach((key) => {
      const vals = groups[key].map((r) => r.value);
      groupStats[key] = computeDescriptiveStatistics(vals);
    });

    // Run comparative test between Full MERA-VLA and Base VLA
    const candidateRuns = runs.filter((r) => String(r.modelVariant || r.modelName).toLowerCase().includes('mera'));
    const baselineRuns = runs.filter((r) => String(r.modelVariant || r.modelName).toLowerCase().includes('base'));

    let comparison = null;
    if (candidateRuns.length > 0 && baselineRuns.length > 0) {
      comparison = executeStatisticalAnalysis(candidateRuns, baselineRuns);
    }

    return res.json({
      success: true,
      groupStats,
      comparison,
      totalRunsAnalyzed: runs.length,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/research/projects/:id/safety/validate
 * Ingests or evaluates safety events and risk-coverage curves
 */
const validateSafety = async (req, res) => {
  try {
    const { id } = req.params;
    const { events = [], tauSafe = 0.35, totalRollouts = 100 } = req.body;
    const filter = getOwnerFilter(req.user);
    const project = await ResearchProject.findOne({ _id: id, ...filter });
    if (!project) {
      return res.status(404).json({ message: 'Research project not found.' });
    }

    if (Array.isArray(events) && events.length > 0) {
      project.safetyEvents.push(...events);
    }

    const allEvents = project.safetyEvents || [];
    const baseEvents = allEvents.filter((e) => String(e.modelVariant || '').toLowerCase().includes('base') || e.threshold === 1.0);
    const gatedEvents = allEvents.filter((e) => String(e.modelVariant || '').toLowerCase().includes('mera') || e.threshold === tauSafe);

    const metrics = computeSafetyMetrics(allEvents, totalRollouts, tauSafe);
    const comparison = computeSafetyComparison(baseEvents, gatedEvents, totalRollouts, tauSafe);

    const readiness = evaluateResearchEvidenceReadiness(project);
    project.evidenceReadiness = readiness;
    await project.save();

    return res.json({
      success: true,
      metrics,
      comparison,
      safetyReadiness: readiness.safetyValidation,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/research/projects/:id/reproducibility
 * Updates reproducibility manifest (Item 19, 20)
 */
const updateReproducibility = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const filter = getOwnerFilter(req.user);
    const project = await ResearchProject.findOne({ _id: id, ...filter });
    if (!project) {
      return res.status(404).json({ message: 'Research project not found.' });
    }

    project.reproducibilityManifest = {
      ...(project.reproducibilityManifest || {}),
      ...updates,
    };

    const readiness = evaluateResearchEvidenceReadiness(project);
    project.evidenceReadiness = readiness;
    await project.save();

    return res.json({
      success: true,
      reproducibilityManifest: project.reproducibilityManifest,
      reproducibilityReadiness: readiness.reproducibility,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/research/projects/:id/math/verify
 * Runs Math <-> Code consistency check (Item 21-26)
 */
const verifyMathConsistency = async (req, res) => {
  try {
    const { id } = req.params;
    const filter = getOwnerFilter(req.user);
    const project = await ResearchProject.findOne({ _id: id, ...filter });
    if (!project) {
      return res.status(404).json({ message: 'Research project not found.' });
    }

    const audit = verifyMathCodeConsistency(CANONICAL_MERA_MATHEMATICAL_DEFINITIONS);
    project.mathematicalDefinitions = CANONICAL_MERA_MATHEMATICAL_DEFINITIONS;
    await project.save();

    return res.json({
      success: true,
      audit,
      definitions: project.mathematicalDefinitions,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/research/projects/:id/transition-mode
 * Transitions paper mode from PRE_EXPERIMENTAL to EMPIRICAL (Item 42)
 * Strictly enforced: Only succeeds when genuine verified experimental evidence exists!
 */
const transitionManuscriptMode = async (req, res) => {
  try {
    const { id } = req.params;
    const filter = getOwnerFilter(req.user);
    const project = await ResearchProject.findOne({ _id: id, ...filter });
    if (!project) {
      return res.status(404).json({ message: 'Research project not found.' });
    }

    const readiness = evaluateResearchEvidenceReadiness(project);

    if (!readiness.isEmpiricalReady) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transition to EMPIRICAL mode: Hard experimental gates failed.',
        blockingGates: readiness.blockingGates,
        readiness,
      });
    }

    // Unlocking EMPIRICAL mode
    console.log(`[transitionManuscriptMode] Unlocking EMPIRICAL mode for project: "${project.title}"`);
    const assembled = await assembleAcademicManuscript(project);
    project.generatedDraft = assembled;
    project.manuscriptObjects = assembled.manuscriptObjects;
    project.evidenceReadiness = readiness;
    await project.save();

    return res.json({
      success: true,
      message: 'Successfully transitioned to EMPIRICAL mode. Results and Discussion sections unlocked.',
      manuscriptMode: assembled.manuscriptMode,
      qualityScore: assembled.qualityScore,
      sections: assembled.sections.map((s) => s.heading),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getEvidenceReadiness,
  planExperimentVariants,
  ingestResults,
  calculateExperimentStats,
  validateSafety,
  updateReproducibility,
  verifyMathConsistency,
  transitionManuscriptMode,
};
