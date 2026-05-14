// apps/web/src/lib/api.ts

/**
 * PRODUCTION API ENDPOINT
 * This is the hardcoded fallback for the Render backend.
 */
const RENDER_BACKEND_URL = "https://paas-k7nx.onrender.com";

// In Next.js, process.env.NEXT_PUBLIC_* is inlined at build time.
const PUBLIC_API_BASE = process.env.NEXT_PUBLIC_VITE_API_BASE;

/**
 * FINAL API RESOLUTION
 * If NEXT_PUBLIC_VITE_API_BASE is set and not empty, use it.
 * Otherwise, ALWAYS use the Render backend URL.
 * This ensures we NEVER use a relative path in production.
 */
export const API_BASE = (PUBLIC_API_BASE && PUBLIC_API_BASE.trim() !== "") 
  ? PUBLIC_API_BASE.trim() 
  : RENDER_BACKEND_URL;

// Ensure it doesn't end with a slash for consistency
const FINAL_API_BASE = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;

export async function apiFetch(path: string, options: RequestInit = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${FINAL_API_BASE}${normalizedPath}`;
  
  try {
    const res = await fetch(url, options);
    const text = await res.text();

    try {
      const data = JSON.parse(text);
      return data;
    } catch (e) {
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error(`API returned HTML instead of JSON. The backend (${FINAL_API_BASE}) might be waking up or serving an error page. Try again in 30s.`);
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

export const getSocketUrl = () => FINAL_API_BASE;
export const getApiUrl = () => FINAL_API_BASE;
