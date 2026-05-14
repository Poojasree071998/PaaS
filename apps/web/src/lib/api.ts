// Last Updated: 2026-05-14T10:59:00Z
export const getApiUrl = () => {

  const RENDER_URL = 'https://paas-k7nx.onrender.com';
  
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:4000';
    }
  }
  
  return RENDER_URL;
};





export const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:4000';
  }
  
  return 'https://paas-k7nx.onrender.com';
};

