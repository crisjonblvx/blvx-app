import axios from 'axios';

// Create a configured axios instance that always sends the auth token
const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  withCredentials: true,
});

// Add auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('blvx-session-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Log for debugging (remove in production)
api.interceptors.request.use((config) => {
  console.log('[API Request]', config.method?.toUpperCase(), config.url, 'Token:', !!localStorage.getItem('blvx-session-token'));
  return config;
});

export default api;
