import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the server rejects our token (401/403), wipe it and send the user to /login.
// This covers the case where the token is expired or invalid (e.g. after a URL
// is copy-pasted into a new browser session).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem('token');
      // Avoid redirect loops if we're already on an auth page.
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register') {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const registerUser  = (data) => api.post('/auth/register', data);
export const loginUser     = (data) => api.post('/auth/login', data);

// ── Agent ─────────────────────────────────────────────────────────────────────
export const analyzePrompt  = (prompt, sessionId) =>
  api.post('/agent/analyze', { prompt, sessionId });

export const refineDiagrams = (refinement, sessionId) =>
  api.post('/agent/refine', { refinement, sessionId });

// ── Diagrams & Sessions ───────────────────────────────────────────────────────
export const fetchSessions    = ()     => api.get('/diagrams/sessions');
export const fetchSessionById = (id)   => api.get(`/diagrams/sessions/${id}`);
export const deleteSession    = (id)   => api.delete(`/diagrams/sessions/${id}`);

export default api;
