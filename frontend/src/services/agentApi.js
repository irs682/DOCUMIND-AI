import api from './api';

export const agentApi = {
  // Autonomous Research Runs & Orchestration
  startRun: (data) => api.post('/agents/runs', data),
  getRuns: (params = {}) => api.get('/agents/runs', { params }),
  getRunById: (id) => api.get(`/agents/runs/${id}`),
  pauseRun: (id) => api.post(`/agents/runs/${id}/pause`),
  resumeRun: (id) => api.post(`/agents/runs/${id}/resume`),
  cancelRun: (id) => api.post(`/agents/runs/${id}/cancel`),
  retryPlanning: (id) => api.post(`/agents/runs/${id}/retry-planning`),
  approveGate: (id, data) => api.post(`/agents/runs/${id}/approve`, data),
  runEvaluation: () => api.post('/agents/evaluate'),

  // Real-time Server-Sent Events (SSE) Stream
  subscribeRunEvents: (id, onMessage, onError) => {
    const token = localStorage.getItem('token');
    const url = token
      ? `/api/agents/runs/${id}/events?token=${encodeURIComponent(token)}`
      : `/api/agents/runs/${id}/events`;

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (err) {
        console.warn('Failed to parse SSE event:', err);
      }
    };

    eventSource.onerror = (err) => {
      if (onError) onError(err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  },

  // Legacy task endpoints for backward compatibility
  executeTask: (data) => api.post('/agents/execute', data),
  getTasks: () => api.get('/agents/tasks'),
  getTaskById: (id) => api.get(`/agents/tasks/${id}`),
};

export default agentApi;
