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
    
    // Auto-logout on 401 Unauthorized
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('df_token');
      localStorage.removeItem('df_user');
      window.location.href = '/login?error=session_expired';
      return { success: false, message: 'Session expired' };
    }

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return { success: false, error: 'Invalid response from server' };
    }
  } catch (err: any) {
    if (typeof window === 'undefined') {
      console.error(`[Build/SSR Error] Fetch failed for ${url}:`, err.message);
      return { success: false, error: err.message };
    }
    throw err;
  }
}

export const getSocketUrl = () => {
  if (typeof window !== 'undefined') {
    // If NEXT_PUBLIC_API_URL is set, use it. 
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) return apiUrl;
    
    // On Vercel production, we MUST use the direct Render URL because Vercel rewrites don't support WebSockets
    if (window.location.hostname.includes('vercel.app')) {
      return "https://paas-k7nx.onrender.com";
    }
    
    // Otherwise (localhost), use current origin
    return window.location.origin;
  }
  return "https://paas-k7nx.onrender.com";
};
export const getApiUrl = () => API_BASE;
