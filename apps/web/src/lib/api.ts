// apps/web/src/lib/api.ts

// PROXY MODE (RELATIVE PATHS)
// We use relative paths so that the Vercel Proxy (vercel.json) can intercept and forward calls to Render.
export const API_BASE = "";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${normalizedPath}`;
  
  try {
    const res = await fetch(url, options);
    const text = await res.text();

    try {
      const data = JSON.parse(text);
      return data;
    } catch (e) {
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error(`API returned HTML instead of JSON. This means the Vercel Proxy is hit but forwarding to Render failed. URL: ${url}`);
      }
      throw new Error(`Invalid JSON from ${url}. Response starts with: ${text.substring(0, 50)}`);
    }
  } catch (err: any) {
    if (err.message === 'Failed to fetch') {
      throw new Error(`Connection failed to ${url}. The Vercel proxy might be misconfigured.`);
    }
    throw err;
  }
}

export const getSocketUrl = () => "https://paas-k7nx.onrender.com";
export const getApiUrl = () => API_BASE;
