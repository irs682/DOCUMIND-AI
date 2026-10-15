import axios from 'axios';

const rawApi = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';
const BASE_URL = rawApi === '/api' ? '/api' : (rawApi.endsWith('/api') ? rawApi : `${rawApi.replace(/\/$/, '')}/api`);

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── In-Memory Cache for Instant Section Switching ────────────────────────
let kbCache = null;
let kbCacheTime = 0;
const KB_CACHE_TTL_MS = 25000; // 25 seconds TTL

export const invalidateKnowledgeBasesCache = () => {
  kbCache = null;
  kbCacheTime = 0;
};

/**
 * Fetch all Knowledge Bases for the current user.
 * Supports transparent in-memory caching so route transitions are instant (0ms).
 * @param {boolean} forceRefresh - pass true to bypass cache
 */
export const fetchKnowledgeBases = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && kbCache && now - kbCacheTime < KB_CACHE_TTL_MS) {
    return kbCache;
  }

  const { data } = await axios.get(`${BASE_URL}/knowledge-bases`, {
    headers: getAuthHeaders(),
  });
  const kbs = data.knowledgeBases || [];
  kbCache = kbs;
  kbCacheTime = Date.now();
  return kbs;
};

/**
 * Fetch a single Knowledge Base by ID including its assigned documents.
 */
export const fetchKnowledgeBaseById = async (id) => {
  const { data } = await axios.get(`${BASE_URL}/knowledge-bases/${id}`, {
    headers: getAuthHeaders(),
  });
  return data; // { knowledgeBase, documents }
};

/**
 * Create a new Knowledge Base.
 */
export const createKnowledgeBase = async (payload) => {
  const { data } = await axios.post(`${BASE_URL}/knowledge-bases`, payload, {
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  });
  invalidateKnowledgeBasesCache();
  return data.knowledgeBase;
};

/**
 * Update Knowledge Base details.
 */
export const updateKnowledgeBase = async (id, payload) => {
  const { data } = await axios.put(`${BASE_URL}/knowledge-bases/${id}`, payload, {
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  });
  invalidateKnowledgeBasesCache();
  return data.knowledgeBase;
};

/**
 * Delete a Knowledge Base (detaches documents cleanly).
 */
export const deleteKnowledgeBase = async (id) => {
  const { data } = await axios.delete(`${BASE_URL}/knowledge-bases/${id}`, {
    headers: getAuthHeaders(),
  });
  invalidateKnowledgeBasesCache();
  return data;
};

/**
 * Add existing documents to a Knowledge Base without file duplication.
 * @param {string} id - KnowledgeBase ID
 * @param {string[]} documentIds - Array of Document IDs to associate
 */
export const addDocumentsToKnowledgeBase = async (id, documentIds) => {
  const { data } = await axios.post(
    `${BASE_URL}/knowledge-bases/${id}/documents`,
    { documentIds },
    { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } }
  );
  return data;
};

/**
 * Remove a document from a Knowledge Base only (preserves global document).
 * @param {string} id - KnowledgeBase ID
 * @param {string} documentId - Document ID
 */
export const removeDocumentFromKnowledgeBase = async (id, documentId) => {
  const { data } = await axios.delete(
    `${BASE_URL}/knowledge-bases/${id}/documents/${documentId}`,
    { headers: getAuthHeaders() }
  );
  return data;
};
