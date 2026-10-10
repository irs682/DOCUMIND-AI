import api from './api';

export const agentApi = {
  executeTask: (data) => api.post('/agents/execute', data),
  getTasks: () => api.get('/agents/tasks'),
  getTaskById: (id) => api.get(`/agents/tasks/${id}`),
};

export default agentApi;
