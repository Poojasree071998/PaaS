// apps/web/src/lib/api.ts

// EMERGENCY PROXY MODE
// We use relative paths so that Vercel/Next.js rewrites can intercept and proxy traffic to Render.
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
        throw new Error(`API returned HTML instead of JSON. The proxy might be failing or the backend is waking up. Try again in 30s.`);
      }
      throw new Error(`Invalid JSON from ${url}. Response starts with: ${text.substring(0, 50)}`);
    }
  } catch (err: any) {
    if (err.message === 'Failed to fetch') {
      throw new Error(`Connection failed to ${url}. Check if the Vercel proxy is correctly configured.`);
    }
    throw err;
  }
}

export const getSocketUrl = () => "https://paas-k7nx.onrender.com"; // Sockets must be absolute
export const getApiUrl = () => API_BASE;
