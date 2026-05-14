// apps/web/src/lib/api.ts

/**
 * DETERMINING THE API BASE URL
 * 
 * In Next.js, environment variables must be prefixed with NEXT_PUBLIC_ to be available in the browser.
 * They are inlined at build time, so dynamic access like process.env[name] often fails.
 */

// 1. Try to get the explicit public env var (Inlined by Next.js)
const NEXT_PUBLIC_API = process.env.NEXT_PUBLIC_VITE_API_BASE;

// 2. Fallback to other possible names (less reliable in browser, but good for SSR)
const VITE_API = process.env.VITE_API_BASE || process.env.VITE_API_URL || process.env.VITE_BACKEND_URL;

// 3. Final Production Fallback
const DEFAULT_API = "https://paas-k7nx.onrender.com";

// Consolidate and ensure we NEVER return an empty string (which would cause relative requests)
export const API_BASE = (NEXT_PUBLIC_API || VITE_API || DEFAULT_API).trim();

// Safety check: If for any reason it's still falsy or just "/", use the default
const FINAL_API_BASE = (API_BASE && API_BASE !== "/") ? API_BASE : DEFAULT_API;

export async function apiFetch(path: string, options: RequestInit = {}) {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Use the validated final base URL
  const url = `${FINAL_API_BASE}${normalizedPath}`;
  
  try {
    const res = await fetch(url, options);
    const text = await res.text();

    try {
      const data = JSON.parse(text);
      return data;
    } catch (e) {
      // If it's HTML, provide a better error message
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error(`API returned HTML, not JSON. This usually means the Render backend (${FINAL_API_BASE}) is waking up or there is a 404/500 error. Please try again in 30 seconds.`);
      }
      throw new Error(`API returned invalid JSON from ${url}. Response starts with: ${text.substring(0, 100)}`);
    }
  } catch (networkError: any) {
    // Handle network errors (like CORS or DNS failures)
    if (networkError.message === 'Failed to fetch') {
      throw new Error(`Connection to backend failed (${url}). Please check if the Render service is active or if there is a CORS block.`);
    }
    throw networkError;
  }
}

// Keep for WebSocket support
export const getSocketUrl = () => {
  return FINAL_API_BASE;
};

// For backward compatibility during migration
export const getApiUrl = () => FINAL_API_BASE;
