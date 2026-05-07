export const getApiUrl = () => {
  let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'deployflow-api';
  
  // Handle local development if hostname is localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:4000';
  }

  // Handle Render URLs
  if (!apiUrl.startsWith('http')) {
    apiUrl = `https://${apiUrl}`;
  }

  if (!apiUrl.includes('.')) {
    apiUrl = `${apiUrl}.onrender.com`;
  }

  return apiUrl;
};

export const getSocketUrl = () => {
  return getApiUrl();
};
