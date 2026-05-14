// Last Updated: 2026-05-14T15:20:00Z
export const getApiUrl = () => {
  // Use NEXT_PUBLIC_ prefix for client-side environment variables in Next.js
  const API_BASE = process.env.NEXT_PUBLIC_VITE_API_BASE || "https://paas-k7nx.onrender.com";
  
  if (typeof window !== 'undefined') {
    // If we are explicitly on localhost and NOT overriding via env var, use local API
    if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && !process.env.NEXT_PUBLIC_VITE_API_BASE) {
      return 'http://localhost:4000';
    }
  }
  
  return API_BASE;
};

export const getSocketUrl = () => {
  const socketBase = process.env.NEXT_PUBLIC_VITE_API_BASE || 'https://paas-k7nx.onrender.com';
  
  if (typeof window !== 'undefined') {
    if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && !process.env.NEXT_PUBLIC_VITE_API_BASE) {
      return 'http://localhost:4000';
    }
  }
  
  return socketBase;
};
