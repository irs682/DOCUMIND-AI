import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Fetch all Knowledge Bases for the current user.
 */
export const fetchKnowledgeBases = async () => {
  const { data } = await axios.get(`${BASE_URL}/knowledge-bases`, {
    headers: getAuthHeaders(),
  });
  return data.knowledgeBases || [];
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
  return data.knowledgeBase;
};

/**
 * Update Knowledge Base details.
 */
export const updateKnowledgeBase = async (id, payload) => {
  const { data } = await axios.put(`${BASE_URL}/knowledge-bases/${id}`, payload, {
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  });
  return data.knowledgeBase;
};

/**
 * Delete a Knowledge Base (detaches documents cleanly).
 */
export const deleteKnowledgeBase = async (id) => {
  const { data } = await axios.delete(`${BASE_URL}/knowledge-bases/${id}`, {
    headers: getAuthHeaders(),
  });
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
