import axios from "axios";

const rawApi = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';
const BASE_URL = rawApi === '/api' ? '/api' : (rawApi.endsWith('/api') ? rawApi : `${rawApi.replace(/\/$/, '')}/api`);
const API_URL = `${BASE_URL}/auth`;

export const registerUser = (data) => {
    return axios.post(`${API_URL}/register`, data);
};

export const loginUser = (data) => {
    return axios.post(`${API_URL}/login`, data);
};