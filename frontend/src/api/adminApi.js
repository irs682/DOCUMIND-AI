import axios from "axios";

const rawApi = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';
const normalizedApi = rawApi === '/api' ? '/api' : (rawApi.endsWith('/api') ? rawApi : `${rawApi.replace(/\/$/, '')}/api`);
const BASE_URL = `${normalizedApi}/admin`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchAdminDashboardStats = async () => {
  const { data } = await axios.get(`${BASE_URL}/dashboard-stats`, {
    headers: getAuthHeaders(),
  });
  return data;
};

export const fetchAdminUsers = async () => {
  const { data } = await axios.get(`${BASE_URL}/users`, {
    headers: getAuthHeaders(),
  });
  return data.users || [];
};

export const updateUserRole = async (userId, role) => {
  const { data } = await axios.put(
    `${BASE_URL}/users/${userId}/role`,
    { role },
    { headers: getAuthHeaders() }
  );
  return data;
};

export const toggleUserStatus = async (userId) => {
  const { data } = await axios.put(
    `${BASE_URL}/users/${userId}/toggle-status`,
    {},
    { headers: getAuthHeaders() }
  );
  return data;
};

export const deleteUser = async (userId) => {
  const { data } = await axios.delete(`${BASE_URL}/users/${userId}`, {
    headers: getAuthHeaders(),
  });
  return data;
};

export const fetchAdminDocuments = async () => {
  const { data } = await axios.get(`${BASE_URL}/documents`, {
    headers: getAuthHeaders(),
  });
  return data.documents || [];
};

export const deleteAdminDocument = async (documentId) => {
  const { data } = await axios.delete(`${BASE_URL}/documents/${documentId}`, {
    headers: getAuthHeaders(),
  });
  return data;
};

export const fetchAIMonitoringStats = async () => {
  const { data } = await axios.get(`${BASE_URL}/ai-monitoring`, {
    headers: getAuthHeaders(),
  });
  return data.monitoring || {};
};

export const fetchAuditLogs = async () => {
  const { data } = await axios.get(`${BASE_URL}/audit-logs`, {
    headers: getAuthHeaders(),
  });
  return data.logs || [];
};
