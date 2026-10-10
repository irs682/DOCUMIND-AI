import api from './api';

export const comparisonApi = {
  compareDocuments: async ({ documentAId, documentBId, projectId = null, forceRecompute = false }) => {
    const response = await api.post('/comparisons', {
      documentAId,
      documentBId,
      projectId,
      forceRecompute,
    });
    return response.data;
  },

  getComparisons: async (projectId = null) => {
    const params = projectId ? { projectId } : {};
    const response = await api.get('/comparisons', { params });
    return response.data;
  },

  getComparisonById: async (id) => {
    const response = await api.get(`/comparisons/${id}`);
    return response.data;
  },

  deleteComparison: async (id) => {
    const response = await api.delete(`/comparisons/${id}`);
    return response.data;
  },
};

export default comparisonApi;
