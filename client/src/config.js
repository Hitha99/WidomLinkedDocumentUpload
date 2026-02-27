// In production, set VITE_API_URL to your backend URL (e.g. https://your-app.railway.app)
const API_BASE = import.meta.env.VITE_API_URL || '';
export const API = API_BASE ? `${API_BASE.replace(/\/$/, '')}/api` : '/api';
