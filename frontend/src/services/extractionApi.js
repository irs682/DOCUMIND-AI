import api from './api';

const compactPayload = (payload) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

const unwrapExtraction = (data) => data?.extraction || data?.data?.extraction || data;

export const extractionApi = {
  create: async ({ documentId, extractionTypes, customFields, projectId, forceRecompute = false }) => {
    const response = await api.post(
      '/extractions',
      compactPayload({ documentId, extractionTypes, customFields, projectId, forceRecompute })
    );

    return {
      extraction: unwrapExtraction(response.data),
      cached: Boolean(response.data?.cached),
    };
  },

  getById: async (id) => {
    const response = await api.get(`/extractions/${id}`);
    return unwrapExtraction(response.data);
  },

  getForDocument: async (documentId) => {
    const response = await api.get(`/documents/${documentId}/extractions`);
    return response.data?.extractions || response.data?.data?.extractions || [];
  },

  delete: async (id) => {
    const response = await api.delete(`/extractions/${id}`);
    return response.data;
  },
};

export default extractionApi;
