import api from './api';

export const searchApi = {
  search: (query, params) => api.get('/search', { params: { q: query, ...params } }),
  semanticSearch: (query, params) => api.post('/search/semantic', { query, ...params }),
};
