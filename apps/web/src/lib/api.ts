// apps/web/src/lib/api.ts

// Support both Next.js (process.env) and Vite (import.meta.env) style env vars
const getEnv = (name: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[name]) return process.env[name];
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) return import.meta.env[name];
  return undefined;
};

export const API_BASE = 
  getEnv('NEXT_PUBLIC_VITE_API_BASE') ||
  getEnv('VITE_API_BASE') ||
  getEnv('VITE_API_URL') ||
  getEnv('VITE_BACKEND_URL') ||
  "https://paas-k7nx.onrender.com";

export async function apiFetch(path: string, options: RequestInit = {}) {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${normalizedPath}`;
  
  const res = await fetch(url, options);
  const text = await res.text();

  try {
    const data = JSON.parse(text);
    return data;
  } catch (e) {
    // If it's HTML, provide a better error message
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error(`API returned HTML, not JSON. This usually means the Render backend (${API_BASE}) is waking up or there is a 404/500 error. Please try again in 30 seconds.`);
    }
    throw new Error(`API returned invalid JSON from ${url}. Response: ${text.substring(0, 100)}...`);
  }
}

// Keep for WebSocket support
export const getSocketUrl = () => {
  return API_BASE;
};

// For backward compatibility during migration
export const getApiUrl = () => API_BASE;
