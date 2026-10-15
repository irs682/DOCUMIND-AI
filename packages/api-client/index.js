/**
 * DOCUMIND-AI Normalized API Client
 * Shared between Web Workstation and Mobile Companion
 * Handles authenticated requests, token injection, caching, and cross-platform uploads
 */

let apiBaseUrl = (typeof process !== 'undefined' && (process.env?.API_URL || process.env?.VITE_API_URL)) ||
  (typeof window !== 'undefined' && (window.__API_URL__ || (window.location?.origin ? `${window.location.origin}/api` : ''))) ||
  'http://localhost:5000/api';
let tokenProvider = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem('token');
  }
  return null;
};
let unauthorizedHandler = () => {};

export const configureApiClient = ({ baseUrl, getToken, onUnauthorized }) => {
  if (baseUrl) apiBaseUrl = baseUrl.replace(/\/$/, '');
  if (getToken) tokenProvider = getToken;
  if (onUnauthorized) unauthorizedHandler = onUnauthorized;
};

export const getApiBaseUrl = () => apiBaseUrl;

// In-memory cache helper
const cache = new Map();
const DEFAULT_TTL_MS = 25000;

export const clearApiCache = (keyPrefix) => {
  if (!keyPrefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) {
      cache.delete(key);
    }
  }
};

const request = async (endpoint, options = {}) => {
  const url = `${apiBaseUrl}${endpoint}`;
  const token = await Promise.resolve(tokenProvider());

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    unauthorizedHandler();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.message || errorData.error || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.json();
};

export const apiClient = {
  // ── Authentication ─────────────────────────────────────────────────────────
  auth: {
    login: async (credentials) => {
      clearApiCache();
      return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },
    register: async (userData) => {
      clearApiCache();
      return request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    getProfile: async () => {
      return request('/auth/profile', { method: 'GET' });
    },
    refresh: async () => {
      return request('/auth/refresh', { method: 'POST' });
    },
    logout: async () => {
      clearApiCache();
      try {
        await request('/auth/logout', { method: 'POST' });
      } catch (_) {}
    },
  },

  // ── Research Projects ──────────────────────────────────────────────────────
  projects: {
    list: async (forceRefresh = false) => {
      const cacheKey = 'projects:list';
      if (!forceRefresh) {
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.time < DEFAULT_TTL_MS) {
          return cached.data;
        }
      }
      const data = await request('/research/projects', { method: 'GET' });
      cache.set(cacheKey, { data, time: Date.now() });
      return data;
    },
    get: async (id) => {
      return request(`/research/projects/${id}`, { method: 'GET' });
    },
    create: async (payload) => {
      clearApiCache('projects:');
      return request('/research/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    update: async (id, payload) => {
      clearApiCache('projects:');
      return request(`/research/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    delete: async (id) => {
      clearApiCache('projects:');
      return request(`/research/projects/${id}`, { method: 'DELETE' });
    },
    executeStep: async (id, stepNumber, data = {}) => {
      clearApiCache('projects:');
      return request(`/research/projects/${id}/step/${stepNumber}/execute`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  // ── Documents ──────────────────────────────────────────────────────────────
  documents: {
    list: async (forceRefresh = false) => {
      const cacheKey = 'documents:list';
      if (!forceRefresh) {
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.time < DEFAULT_TTL_MS) {
          return cached.data;
        }
      }
      const data = await request('/documents', { method: 'GET' });
      cache.set(cacheKey, { data, time: Date.now() });
      return data;
    },
    get: async (id) => {
      return request(`/documents/${id}`, { method: 'GET' });
    },
    delete: async (id) => {
      clearApiCache('documents:');
      return request(`/documents/${id}`, { method: 'DELETE' });
    },
    reindex: async (id) => {
      clearApiCache('documents:');
      return request(`/documents/${id}/reindex`, { method: 'POST' });
    },
    // Multi-platform file upload (FormData for Web & React Native)
    upload: async (formData) => {
      clearApiCache('documents:');
      clearApiCache('projects:');
      const token = await Promise.resolve(tokenProvider());
      const response = await fetch(`${apiBaseUrl}/documents/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to upload document');
      }
      return response.json();
    },
  },

  // ── Knowledge Bases ────────────────────────────────────────────────────────
  knowledgeBases: {
    list: async (forceRefresh = false) => {
      const cacheKey = 'kb:list';
      if (!forceRefresh) {
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.time < DEFAULT_TTL_MS) {
          return cached.data;
        }
      }
      const data = await request('/knowledge-bases', { method: 'GET' });
      cache.set(cacheKey, { data, time: Date.now() });
      return data;
    },
    get: async (id) => {
      return request(`/knowledge-bases/${id}`, { method: 'GET' });
    },
  },

  // ── AI Chat ────────────────────────────────────────────────────────────────
  chat: {
    sendMessage: async (payload) => {
      return request('/chat/message', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    askDocument: async (question, documentId) => {
      return request('/ai/ask', {
        method: 'POST',
        body: JSON.stringify({ question, documentId }),
      });
    },
    listSessions: async (projectId) => {
      const qs = projectId ? `?projectId=${projectId}` : '';
      return request(`/chat/sessions${qs}`, { method: 'GET' });
    },
    getSession: async (id) => {
      return request(`/chat/sessions/${id}`, { method: 'GET' });
    },
  },

  // ── Research & Manuscripts ─────────────────────────────────────────────────
  research: {
    getWorkspace: async (projectId) => {
      return request(`/research/projects/${projectId}`, { method: 'GET' });
    },
    updateStep: async (projectId, stepNumber, data) => {
      clearApiCache('projects:');
      return request(`/research/projects/${projectId}/step/${stepNumber}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    runAudit: async (projectId) => {
      return request(`/research/projects/${projectId}/audit`, { method: 'POST' });
    },
    runReviewerCheck: async (projectId) => {
      return request(`/research/projects/${projectId}/reviewer-check`, { method: 'POST' });
    },
  },

  manuscripts: {
    get: async (projectId) => {
      const proj = await request(`/research/projects/${projectId}`, { method: 'GET' });
      return proj.data?.project?.generatedDraft || null;
    },
    saveObject: async (projectId, objectData) => {
      clearApiCache('projects:');
      return request(`/research/projects/${projectId}/manuscript-objects`, {
        method: 'POST',
        body: JSON.stringify(objectData),
      });
    },
    exportPdfUrl: (projectId) => {
      return `${apiBaseUrl}/research/projects/${projectId}/export/pdf`;
    },
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  notifications: {
    list: async () => {
      return request('/analytics/notifications', { method: 'GET' }).catch(() => ({
        notifications: [],
      }));
    },
    markAsRead: async (id) => {
      return request(`/analytics/notifications/${id}/read`, { method: 'POST' }).catch(() => ({}));
    },
  },
};

export default apiClient;
