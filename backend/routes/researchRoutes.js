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
} = require('../controllers/researchProjectController');
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
