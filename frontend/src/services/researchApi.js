import api from './api';

// In-memory cache for fast project list retrieval
let projectsCache = null;
let projectsCacheTime = 0;
const PROJECTS_CACHE_TTL_MS = 25000; // 25 seconds TTL

export const invalidateProjectsCache = () => {
  projectsCache = null;
  projectsCacheTime = 0;
};

export const researchApi = {
  // AI Research Workspace: Guided Projects
  getProjects: async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && projectsCache && now - projectsCacheTime < PROJECTS_CACHE_TTL_MS) {
      return projectsCache;
    }
    const res = await api.get('/research/projects');
    projectsCache = res;
    projectsCacheTime = Date.now();
    return res;
  },
  getProjectById: (id) => api.get(`/research/projects/${id}`),
  createProject: async (data) => {
    invalidateProjectsCache();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('documind:refresh-counts'));
    }
    return api.post('/research/projects', data);
  },
  updateProject: async (id, data) => {
    invalidateProjectsCache();
    return api.patch(`/research/projects/${id}`, data);
  },
  updateProjectGoal: async (id, data) => {
    invalidateProjectsCache();
    return api.patch(`/research/projects/${id}/goal`, data);
  },
  deleteProject: async (id) => {
    invalidateProjectsCache();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('documind:refresh-counts'));
    }
    return api.delete(`/research/projects/${id}`);
  },
  executeStep: async (id, stepNumber, data = {}) => {
    invalidateProjectsCache();
    return api.post(`/research/projects/${id}/step/${stepNumber}/execute`, data);
  },
  saveManuscriptObject: (id, data) =>
    api.post(`/research/projects/${id}/manuscript-objects`, data),
  deleteManuscriptObject: (id, objId) =>
    api.delete(`/research/projects/${id}/manuscript-objects/${objId}`),
  validateManuscript: (id) =>
    api.get(`/research/projects/${id}/validate`),
  exportProjectPdf: (id) =>
    api.get(`/research/projects/${id}/export/pdf`),
  runQualityAudit: (id) =>
    api.post(`/research/projects/${id}/audit`),
  runReviewerCheck: (id) =>
    api.post(`/research/projects/${id}/reviewer-check`),
  createRevision: (id, data) =>
    api.post(`/research/projects/${id}/revisions`, data),
  restoreRevision: (id, versionNumber) =>
    api.post(`/research/projects/${id}/revisions/${versionNumber}/restore`),
  exportBibtex: (id) =>
    api.get(`/research/projects/${id}/export/bibtex`),

  // Scientific Benchmark Compatibility & Common Evaluation Plans (Step 4)
  saveEvaluationPlan: (id, data) =>
    api.post(`/research/projects/${id}/evaluation-plans`, data),
  getEvaluationPlans: (id) =>
    api.get(`/research/projects/${id}/evaluation-plans`),
  addBenchmarkResult: (id, data) =>
    api.post(`/research/projects/${id}/benchmark-results`, data),
  setComparisonStrategy: (id, data) =>
    api.post(`/research/projects/${id}/comparison-strategy`, data),
  getBenchmarkCatalogDetails: (id, key) =>
    api.get(`/research/projects/${id}/benchmark-details/${encodeURIComponent(key)}`),

  // Research Copilot & Autonomous Live Paper Workspace
  copilotChat: (id, data) =>
    api.post(`/research/projects/${id}/copilot/chat`, data),
  copilotRewrite: (id, data) =>
    api.post(`/research/projects/${id}/copilot/rewrite`, data),
  applyRewrite: (id, data) =>
    api.post(`/research/projects/${id}/copilot/apply-rewrite`, data),
  getLiveStatus: (id) =>
    api.get(`/research/projects/${id}/copilot/live-status`),
  startLiveGeneration: (id, data) =>
    api.post(`/research/projects/${id}/copilot/generate-live`, data),

  // Phase 7: Research Studies
  generateReport: (data) => api.post('/research/generate', data),
  getReports: () => api.get('/research/reports'),
  getReportById: (id) => api.get(`/research/reports/${id}`),

  // Phase 8: Scientific Benchmark & Evaluation Framework
  createDataset: (data) => api.post('/research/datasets', data),
  getDatasets: () => api.get('/research/datasets'),
  runEvaluation: (data) => api.post('/research/evaluate', data),
  getEvaluationResults: () => api.get('/research/results'),

  // Empirical Evidence & Readiness Engine
  getReadiness: (id) =>
    api.get(`/research/projects/${id}/readiness`),
  planExperimentVariants: (id, data = {}) =>
    api.post(`/research/projects/${id}/experiments/plan`, data),
  ingestExperiments: (id, data) =>
    api.post(`/research/projects/${id}/experiments/ingest`, data),
  computeExperimentStats: (id, data = {}) =>
    api.post(`/research/projects/${id}/experiments/stats`, data),
  validateSafety: (id, data = {}) =>
    api.post(`/research/projects/${id}/safety/validate`, data),
  saveReproducibility: (id, data) =>
    api.post(`/research/projects/${id}/reproducibility`, data),
  verifyMathematics: (id, data = {}) =>
    api.post(`/research/projects/${id}/math/verify`, data),
  transitionMode: (id, data = {}) =>
    api.post(`/research/projects/${id}/transition-mode`, data),
};

export default researchApi;
