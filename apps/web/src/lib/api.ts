export const getApiUrl = () => {
  // 1. Priority: Environment Variable
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  
  // 2. Production Fallback (Render)
  const isProd = 
    (typeof window !== 'undefined' && (
      window.location.hostname.includes('vercel.app') || 
      window.location.hostname.includes('onrender.com') ||
      (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    )) || 
    process.env.NODE_ENV === 'production';

  if (isProd) {
    return 'https://paas-k7nx.onrender.com';
  }

  // 3. Local Development Fallback
  return 'http://localhost:4000';
};


export const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:4000';
  }
  
  return 'https://paas-k7nx.onrender.com';
};

