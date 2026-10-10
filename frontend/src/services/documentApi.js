import api from './api';

export const documentApi = {
  getAll: (params) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/documents/${id}`),
  reindex: (id) => api.post(`/documents/${id}/reindex`),
  getProcessingStatus: (id) => api.get(`/documents/${id}/status`),
};
