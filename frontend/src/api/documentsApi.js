import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Get auth token from localStorage (set during login).
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Documents API ─────────────────────────────────────────────────────────

/**
 * Fetch all documents for the authenticated user.
 */
export const fetchDocuments = async () => {
  const { data } = await axios.get(`${BASE_URL}/documents`, {
    headers: getAuthHeaders(),
  });
  return data.documents || [];
};

/**
 * Upload a document file to the backend.
 * @param {File} file
 * @param {string} knowledgeBase - Name of knowledge base
 * @param {string} knowledgeBaseId
 * @param {function} onProgress - optional progress callback (0-100)
 */
export const uploadDocument = async (file, knowledgeBase, knowledgeBaseId, onProgress, projectId = null) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('knowledgeBase', knowledgeBase || 'General KB');
  if (knowledgeBaseId) {
    formData.append('knowledgeBaseId', knowledgeBaseId);
  }
  if (projectId) formData.append('projectId', projectId);

  const { data } = await axios.post(`${BASE_URL}/documents/upload`, formData, {
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(pct);
      }
    },
  });
  return data.document;
};

/**
 * Delete a document by ID.
 */
export const deleteDocument = async (documentId) => {
  const { data } = await axios.delete(`${BASE_URL}/documents/${documentId}`, {
    headers: getAuthHeaders(),
  });
  return data;
};

/**
 * Re-index a document by ID.
 */
export const reindexDocument = async (documentId) => {
  const { data } = await axios.post(`${BASE_URL}/documents/${documentId}/reindex`, {}, {
    headers: getAuthHeaders(),
  });
  return data;
};

// ─── AI / RAG API ──────────────────────────────────────────────────────────

/**
 * Ask an AI question about a specific document.
 * @param {string} question
 * @param {string} documentId - MongoDB document _id
 */
export const askDocumentQuestion = async (question, documentId) => {
  const { data } = await axios.post(
    `${BASE_URL}/ai/ask`,
    { question, documentId },
    { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } }
  );
  return data; // { success, answer, sources }
};
