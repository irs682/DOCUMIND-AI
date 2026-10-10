import api from './api';

export const adminApi = {
  getDashboardStats: () => api.get('/admin/dashboard-stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getStats: () => api.get('/admin/stats'),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getAIMetrics: () => api.get('/admin/ai-metrics'),
};

