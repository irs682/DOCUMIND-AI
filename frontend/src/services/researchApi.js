import api from './api';

export const researchApi = {
  // AI Research Workspace: Guided Projects
  getProjects: () => api.get('/research/projects'),
  getProjectById: (id) => api.get(`/research/projects/${id}`),
  createProject: (data) => api.post('/research/projects', data),
  updateProject: (id, data) => api.patch(`/research/projects/${id}`, data),
  updateProjectGoal: (id, data) => api.patch(`/research/projects/${id}/goal`, data),
  deleteProject: (id) => api.delete(`/research/projects/${id}`),
  executeStep: (id, stepNumber, data = {}) =>
    api.post(`/research/projects/${id}/step/${stepNumber}/execute`, data),
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

  // Phase 7: Research Studies
  generateReport: (data) => api.post('/research/generate', data),
  getReports: () => api.get('/research/reports'),
  getReportById: (id) => api.get(`/research/reports/${id}`),

  // Phase 8: Scientific Benchmark & Evaluation Framework
  createDataset: (data) => api.post('/research/datasets', data),
  getDatasets: () => api.get('/research/datasets'),
  runEvaluation: (data) => api.post('/research/evaluate', data),
  getEvaluationResults: () => api.get('/research/results'),
};

export default researchApi;
