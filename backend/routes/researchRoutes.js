const express = require('express');
const {
  generateReport,
  getReports,
  getReportById,
  createDataset,
  getDatasets,
  evaluateRAG,
  getEvaluationResults,
} = require('../controllers/researchController');
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  updateProjectGoal,
  deleteProject,
  executeProjectStep,
  saveManuscriptObject,
  deleteManuscriptObject,
  validateProjectManuscript,
  exportProjectPdf,
  runQualityAudit,
  runReviewerCheck,
  createManuscriptRevision,
  restoreManuscriptRevision,
  exportBibtex,
  handleCopilotChat,
  handleCopilotRewrite,
  handleApplyRewrite,
  handleLiveStatus,
  handleStartAutonomousGeneration,
  handleStreamEvents,
  saveEvaluationPlan,
  getEvaluationPlans,
  addBenchmarkResult,
  setComparisonStrategy,
  getBenchmarkCatalogDetails,
} = require('../controllers/researchProjectController');
const {
  getEvidenceReadiness,
  planExperimentVariants,
  ingestResults,
  calculateExperimentStats,
  validateSafety,
  updateReproducibility,
  verifyMathConsistency,
  transitionManuscriptMode,
} = require('../controllers/researchEvidenceController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// ── AI Research Workspace: Guided Research Projects ──
router.get('/projects', getProjects);
router.post('/projects', createProject);
router.get('/projects/:id', getProjectById);
router.patch('/projects/:id/goal', updateProjectGoal);
router.patch('/projects/:id', updateProject);
router.delete('/projects/:id', deleteProject);
router.post('/projects/:id/step/:stepNumber/execute', executeProjectStep);
router.post('/projects/:id/manuscript-objects', saveManuscriptObject);
router.delete('/projects/:id/manuscript-objects/:objId', deleteManuscriptObject);
router.get('/projects/:id/validate', validateProjectManuscript);
router.get('/projects/:id/export/pdf', exportProjectPdf);
router.post('/projects/:id/export', exportProjectPdf);
router.post('/projects/:id/audit', runQualityAudit);
router.post('/projects/:id/reviewer-check', runReviewerCheck);
router.post('/projects/:id/revisions', createManuscriptRevision);
router.post('/projects/:id/revisions/:versionNumber/restore', restoreManuscriptRevision);
router.get('/projects/:id/export/bibtex', exportBibtex);

// ── Step 4 Canonical Benchmark Compatibility & Evaluation Plans ──
router.post('/projects/:id/evaluation-plans', saveEvaluationPlan);
router.get('/projects/:id/evaluation-plans', getEvaluationPlans);
router.post('/projects/:id/benchmark-results', addBenchmarkResult);
router.post('/projects/:id/comparison-strategy', setComparisonStrategy);
router.get('/projects/:id/benchmark-details/:benchmarkKey', getBenchmarkCatalogDetails);

// ── Research Evidence, Statistics, Safety & Reproducibility Pipeline ──
router.get('/projects/:id/readiness', getEvidenceReadiness);
router.post('/projects/:id/experiments/plan', planExperimentVariants);
router.post('/projects/:id/experiments/ingest', ingestResults);
router.post('/projects/:id/experiments/stats', calculateExperimentStats);
router.post('/projects/:id/safety/validate', validateSafety);
router.post('/projects/:id/reproducibility', updateReproducibility);
router.post('/projects/:id/math/verify', verifyMathConsistency);
router.post('/projects/:id/transition-mode', transitionManuscriptMode);

// ── Research Copilot & Live Autonomous Generation ──
router.post('/projects/:id/copilot/chat', handleCopilotChat);
router.post('/projects/:id/copilot/rewrite', handleCopilotRewrite);
router.post('/projects/:id/copilot/apply-rewrite', handleApplyRewrite);
router.get('/projects/:id/copilot/live-status', handleLiveStatus);
router.post('/projects/:id/copilot/generate-live', handleStartAutonomousGeneration);
router.get('/projects/:id/copilot/events', handleStreamEvents);

// ── Research Reports (Phase 7, SRS Section 29, 31) ──
router.post('/generate', generateReport);
router.get('/reports', getReports);
router.get('/reports/:id', getReportById);

// ── Research Datasets & Evaluation Benchmark (Phase 8, SRS Section 35, 36, 37, 44) ──
router.post('/datasets', createDataset);
router.get('/datasets', getDatasets);
router.post('/evaluate', evaluateRAG);
router.get('/results', getEvaluationResults);

module.exports = router;
