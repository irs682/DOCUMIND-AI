import api from './api';

export const projectApi = {
  list: (params = {}) => api.get('/projects', { params }),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.patch(`/projects/${id}`, data),
  pin: (id, isPinned) => api.patch(`/projects/${id}/pin`, { isPinned }),
  archive: (id, status) => api.patch(`/projects/${id}/archive`, { status }),
  linkDocuments: (id, documentIds) => api.post(`/projects/${id}/documents`, { documentIds }),
  removeDocument: (id, documentId) => api.delete(`/projects/${id}/documents/${documentId}`),
  remove: (id, data = {}) => api.delete(`/projects/${id}`, { data }),
};

export default projectApi;
