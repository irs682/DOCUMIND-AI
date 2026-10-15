/**
 * DOCUMIND-AI Mobile Offline Cache & Sync Engine
 * Caches essential project summaries, document metadata, and manuscript previews
 * Server remains canonical; queues offline-capable user edits.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEYS = {
  PROJECTS: 'documind_cache_projects',
  DOCUMENTS: 'documind_cache_documents',
  MANUSCRIPTS: 'documind_cache_manuscripts_',
  PENDING_MUTATIONS: 'documind_pending_mutations',
  LAST_SYNC: 'documind_last_sync_timestamp',
};

export const cacheProjects = async (projects) => {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.PROJECTS, JSON.stringify(projects || []));
    await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, String(Date.now()));
  } catch (err) {
    console.warn('Offline cache save error:', err);
  }
};

export const getCachedProjects = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.PROJECTS);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
};

export const cacheDocuments = async (documents) => {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.DOCUMENTS, JSON.stringify(documents || []));
  } catch (err) {
    console.warn('Offline docs cache save error:', err);
  }
};

export const getCachedDocuments = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.DOCUMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
};

export const cacheManuscript = async (projectId, manuscript) => {
  try {
    if (!projectId || !manuscript) return;
    await AsyncStorage.setItem(`${CACHE_KEYS.MANUSCRIPTS}${projectId}`, JSON.stringify(manuscript));
  } catch (err) {
    console.warn('Offline manuscript cache save error:', err);
  }
};

export const getCachedManuscript = async (projectId) => {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_KEYS.MANUSCRIPTS}${projectId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

export const queueOfflineMutation = async (mutation) => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.PENDING_MUTATIONS);
    const list = raw ? JSON.parse(raw) : [];
    list.push({
      ...mutation,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    });
    await AsyncStorage.setItem(CACHE_KEYS.PENDING_MUTATIONS, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to queue offline mutation:', err);
  }
};

export const getPendingMutations = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.PENDING_MUTATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
};

export const clearPendingMutations = async () => {
  try {
    await AsyncStorage.removeItem(CACHE_KEYS.PENDING_MUTATIONS);
  } catch (_) {}
};

export default {
  cacheProjects,
  getCachedProjects,
  cacheDocuments,
  getCachedDocuments,
  cacheManuscript,
  getCachedManuscript,
  queueOfflineMutation,
  getPendingMutations,
  clearPendingMutations,
};
