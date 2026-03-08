// In dev: empty string → Vite proxy handles /api and /uploads
// In production: set VITE_API_URL to your deployed backend URL (e.g. https://my-backend.vercel.app)
export const apiBase = import.meta.env.VITE_API_URL || ''
