import api from './api';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  uploadAvatar: (formData) => api.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  removeAvatar: () => api.delete('/auth/avatar'),
};

