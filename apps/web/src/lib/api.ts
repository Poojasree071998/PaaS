// apps/web/src/lib/api.ts

// PROXY MODE (RELATIVE PATHS)
// We use relative paths so that the Vercel Proxy (vercel.json) can intercept and forward calls to Render.
export const API_BASE = "";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // SSR/Build Safety: Next.js 15+ can crash if fetch is called with a relative URL on the server
  if (typeof window === 'undefined' && !API_BASE) {
    console.warn(`[Build/SSR] Skipping relative fetch: ${normalizedPath}`);
    return { success: false, error: 'Relative fetch skipped during SSR/Build' };
  }

  // Auth Handling
  const fetchOptions = { ...options };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('df_token');
    if (token) {
      fetchOptions.headers = {
        ...(fetchOptions.headers || {}),
        'Authorization': `Bearer ${token}`
      } as any;
    }
  }

  const url = `${API_BASE}${normalizedPath}`;
  
  try {
    const res = await fetch(url, fetchOptions);
    const text = await res.text();

    try {
      const data = JSON.parse(text);
      return data;
    } catch (e) {
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error(`API returned HTML instead of JSON. URL: ${url}`);
      }
      throw new Error(`Invalid JSON from ${url}.`);
    }
  } catch (err: any) {
    if (typeof window === 'undefined') {
      console.error(`[Build/SSR Error] Fetch failed for ${url}:`, err.message);
      return { success: false, error: err.message };
    }
    throw err;
  }
}

export const getSocketUrl = () => "https://paas-k7nx.onrender.com";
export const getApiUrl = () => API_BASE;
