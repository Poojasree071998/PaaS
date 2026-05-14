export const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  
  const url = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:4000'
    : 'https://paas-k7nx.onrender.com';
    
  console.log(`[DeployFlow] API URL: ${url} (Hostname: ${typeof window !== 'undefined' ? window.location.hostname : 'SSR'})`);
  return url;
};




export const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:4000';
  }
  
  return 'https://paas-k7nx.onrender.com';
};

