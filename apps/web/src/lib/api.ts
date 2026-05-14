// apps/web/src/lib/api.ts

// HARDCODED PRODUCTION URL - NO ENVIRONMENT VARIABLES
// This ensures that the frontend ALWAYS connects to the Render backend.
export const API_BASE = "https://paas-k7nx.onrender.com";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${normalizedPath}`;
  
  console.log(`[API] Fetching: ${url}`);
  
  try {
    const res = await fetch(url, options);
    const text = await res.text();

    try {
      const data = JSON.parse(text);
      return data;
    } catch (e) {
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error(`API returned HTML instead of JSON. The backend (${API_BASE}) might be waking up. Try again in 30s.`);
      }
      throw new Error(`Invalid JSON from ${url}. Response starts with: ${text.substring(0, 50)}`);
    }
  } catch (err: any) {
    if (err.message === 'Failed to fetch') {
      throw new Error(`Connection failed to ${url}. The backend might be sleeping or blocked by CORS.`);
    }
    throw err;
  }
}

export const getSocketUrl = () => API_BASE;
export const getApiUrl = () => API_BASE;
